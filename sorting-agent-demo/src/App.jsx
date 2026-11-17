import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";

const GRID_SIZE = 10;

const initialObjects = [
  { id: "food", kind: "food", label: "Food", emoji: "🍎", position: { x: 7, y: 2 }, intensity: 1 },
  { id: "threat", kind: "threat", label: "Threat", emoji: "🐺", position: { x: 6, y: 4 }, intensity: 1 },
  { id: "shelter", kind: "shelter", label: "Shelter", emoji: "🏠", position: { x: 2, y: 7 }, intensity: 1 },
  { id: "novelty", kind: "novelty", label: "Novelty", emoji: "✨", position: { x: 8, y: 8 }, intensity: 1 },
];

const actions = [
  { name: "Up", dx: 0, dy: -1 },
  { name: "Down", dx: 0, dy: 1 },
  { name: "Left", dx: -1, dy: 0 },
  { name: "Right", dx: 1, dy: 0 },
  { name: "Wait", dx: 0, dy: 0 },
];

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function clampPos(pos) {
  return {
    x: Math.max(0, Math.min(GRID_SIZE - 1, pos.x)),
    y: Math.max(0, Math.min(GRID_SIZE - 1, pos.y)),
  };
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function proximityScore(pos, obj) {
  const d = distance(pos, obj.position);
  return clamp(100 - d * 14);
}

function nearestObject(pos, objects, kind) {
  return objects
    .filter((obj) => obj.kind === kind)
    .sort((a, b) => distance(pos, a.position) - distance(pos, b.position))[0];
}

function buildObjectModel(agent, objects) {
  return objects
    .map((obj) => {
      const d = distance(agent.position, obj.position);
      let baseSalience = proximityScore(agent.position, obj);

      if (obj.kind === "food") baseSalience += agent.hunger * 0.85;
      if (obj.kind === "threat") baseSalience += agent.fear * 1.1 + agent.pain * 0.4;
      if (obj.kind === "shelter") baseSalience += agent.fear * 0.75 + (100 - agent.energy) * 0.25;
      if (obj.kind === "novelty") baseSalience += agent.curiosity * 0.9;

      return {
        ...obj,
        distance: d,
        salience: clamp(Math.round(baseSalience)),
      };
    })
    .sort((a, b) => b.salience - a.salience);
}

function calculateEmotion(agent, objects, position = agent.position) {
  const food = nearestObject(position, objects, "food");
  const threat = nearestObject(position, objects, "threat");
  const shelter = nearestObject(position, objects, "shelter");
  const novelty = nearestObject(position, objects, "novelty");

  const foodNear = food ? proximityScore(position, food) : 0;
  const threatNear = threat ? proximityScore(position, threat) : 0;
  const shelterNear = shelter ? proximityScore(position, shelter) : 0;
  const noveltyNear = novelty ? proximityScore(position, novelty) : 0;

  return {
    hungerPressure: clamp(agent.hunger + (100 - foodNear) * 0.12),
    threatPressure: clamp(agent.fear + threatNear * 0.65 + agent.pain * 0.35 - shelterNear * 0.25),
    energyPressure: clamp(100 - agent.energy),
    curiosityPressure: clamp(agent.curiosity + noveltyNear * 0.45),
    comfort: clamp(100 - agent.hunger * 0.25 - agent.fear * 0.3 - agent.pain * 0.35 + shelterNear * 0.25),
  };
}

function emotionalUtility(emotion) {
  return (
    emotion.comfort * 1.2 -
    emotion.hungerPressure * 0.65 -
    emotion.threatPressure * 0.9 -
    emotion.energyPressure * 0.35 +
    emotion.curiosityPressure * 0.12
  );
}

function simulateAction(action, agent, objects) {
  const nextPosition = clampPos({
    x: agent.position.x + action.dx,
    y: agent.position.y + action.dy,
  });

  const nowEmotion = calculateEmotion(agent, objects, agent.position);
  const nextEmotion = calculateEmotion(agent, objects, nextPosition);

  const food = nearestObject(nextPosition, objects, "food");
  const threat = nearestObject(nextPosition, objects, "threat");
  const shelter = nearestObject(nextPosition, objects, "shelter");
  const novelty = nearestObject(nextPosition, objects, "novelty");

  const foodGain = food ? proximityScore(nextPosition, food) * (agent.hunger / 100) : 0;
  const safetyGain = shelter ? proximityScore(nextPosition, shelter) * (agent.fear / 100) : 0;
  const noveltyGain = novelty ? proximityScore(nextPosition, novelty) * (agent.curiosity / 100) : 0;
  const damageRisk = threat ? proximityScore(nextPosition, threat) * (agent.fear / 100) : 0;
  const energyCost = action.name === "Wait" ? 0 : 5 + (100 - agent.energy) * 0.04;

  const currentUtility = emotionalUtility(nowEmotion);
  const futureUtility = emotionalUtility(nextEmotion);

  const score =
    futureUtility -
    currentUtility +
    foodGain * 0.45 +
    safetyGain * 0.35 +
    noveltyGain * 0.18 -
    damageRisk * 0.7 -
    energyCost;

  const explanation = [];
  if (foodGain > 30) explanation.push("food becomes emotionally attractive");
  if (damageRisk > 30) explanation.push("danger sharply worsens the future state");
  if (safetyGain > 25) explanation.push("shelter improves predicted safety");
  if (noveltyGain > 25) explanation.push("curiosity pulls attention toward novelty");
  if (energyCost > 7) explanation.push("movement is costly while energy is low");
  if (action.name === "Wait") explanation.push("waiting avoids movement cost but does not solve need");

  return {
    action,
    nextPosition,
    score,
    nowEmotion,
    nextEmotion,
    deltas: {
      foodGain: Math.round(foodGain),
      safetyGain: Math.round(safetyGain),
      noveltyGain: Math.round(noveltyGain),
      damageRisk: Math.round(damageRisk),
      energyCost: Math.round(energyCost),
    },
    explanation: explanation.length ? explanation.join("; ") : "small expected change",
  };
}

function generateReport(agent, objectModel, rankedActions) {
  const top = objectModel[0];
  const best = rankedActions[0];
  const food = objectModel.find((obj) => obj.kind === "food");
  const threat = objectModel.find((obj) => obj.kind === "threat");

  const conflict =
    agent.hunger > 65 &&
    agent.fear > 65 &&
    food &&
    threat &&
    food.distance <= 5 &&
    threat.distance <= 5;

  if (conflict) {
    return `I am conflicted. The food matters because hunger is high, but the threat is also shaping my experience. My best predicted move is ${best.action.name.toLowerCase()} because it gives the least bad emotional trajectory.`;
  }

  if (top?.kind === "threat") {
    return `The threat dominates attention. I am experiencing the world as unsafe, so the optimiser prefers ${best.action.name.toLowerCase()} to reduce expected fear and damage.`;
  }

  if (top?.kind === "food") {
    return `Hunger makes the food the central object. The optimiser prefers ${best.action.name.toLowerCase()} because food is expected to improve the emotional state.`;
  }

  if (top?.kind === "shelter") {
    return `Safety is the main concern. Shelter is salient because fear or low energy makes protection valuable. I choose ${best.action.name.toLowerCase()}.`;
  }

  return `Curiosity and low pressure make exploration available. I choose ${best.action.name.toLowerCase()} because it slightly improves the next emotional state.`;
}

function Bar({ label, value }) {
  return (
    <div className="meter">
      <div className="meter__label">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="meter__track">
        <div className="meter__fill" style={{ width: `${clamp(value)}%` }} />
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }) {
  return (
    <label className="slider">
      <div className="slider__label">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function handleResourceChange(position, objects, kind, radius, delta) {
  const nearest = nearestObject(position, objects, kind);
  if (!nearest) return 0;
  return distance(position, nearest.position) <= radius ? delta : 0;
}

export default function App() {
  const [agent, setAgent] = useState({
    position: { x: 3, y: 3 },
    hunger: 78,
    fear: 62,
    energy: 55,
    pain: 10,
    curiosity: 35,
  });
  const [objects] = useState(initialObjects);
  const [steps, setSteps] = useState(0);

  const objectModel = useMemo(() => buildObjectModel(agent, objects), [agent, objects]);
  const rankedActions = useMemo(
    () => actions.map((action) => simulateAction(action, agent, objects)).sort((a, b) => b.score - a.score),
    [agent, objects],
  );
  const report = useMemo(() => generateReport(agent, objectModel, rankedActions), [agent, objectModel, rankedActions]);
  const emotion = calculateEmotion(agent, objects);

  function step() {
    const best = rankedActions[0];
    setAgent((prev) => ({
      ...prev,
      position: best.nextPosition,
      hunger: clamp(prev.hunger + 2 + handleResourceChange(best.nextPosition, objects, "food", 0, -45)),
      fear: clamp(prev.fear + handleResourceChange(best.nextPosition, objects, "shelter", 0, -25)),
      energy: clamp(prev.energy - (best.action.name === "Wait" ? 1 : 4)),
      pain: clamp(prev.pain + handleResourceChange(best.nextPosition, objects, "threat", 1, 12) - 2),
      curiosity: clamp(prev.curiosity + 1),
    }));
    setSteps((prev) => prev + 1);
  }

  function resetScenario(type) {
    const scenarios = {
      hungry: { position: { x: 3, y: 3 }, hunger: 92, fear: 20, energy: 70, pain: 0, curiosity: 25 },
      afraid: { position: { x: 3, y: 3 }, hunger: 45, fear: 92, energy: 45, pain: 20, curiosity: 15 },
      conflict: { position: { x: 5, y: 3 }, hunger: 90, fear: 88, energy: 50, pain: 15, curiosity: 20 },
      curious: { position: { x: 5, y: 7 }, hunger: 20, fear: 15, energy: 80, pain: 0, curiosity: 90 },
    };

    setAgent(scenarios[type]);
    setSteps(0);
  }

  return (
    <div className="app-shell">
      <div className="page">
        <header className="hero">
          <div>
            <p className="eyebrow">Toy decision architecture</p>
            <h1>Sorting Agent</h1>
            <p className="hero__copy">
              A visible loop from body and world input through salience, emotion, simulated futures, chosen action, and
              verbal report.
            </p>
          </div>
          <button className="primary-button" onClick={step}>
            Step mind
          </button>
        </header>

        <div className="scenario-row">
          <button onClick={() => resetScenario("hungry")}>Hungry</button>
          <button onClick={() => resetScenario("afraid")}>Afraid</button>
          <button onClick={() => resetScenario("conflict")}>Conflict</button>
          <button onClick={() => resetScenario("curious")}>Curious</button>
        </div>

        <main className="layout-grid">
          <section className="panel">
            <div className="panel__header">
              <h2>World</h2>
              <span>step {steps}</span>
            </div>
            <div className="world-grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                const x = index % GRID_SIZE;
                const y = Math.floor(index / GRID_SIZE);
                const object = objects.find((obj) => obj.position.x === x && obj.position.y === y);
                const isAgent = agent.position.x === x && agent.position.y === y;

                return (
                  <div key={index} className="world-cell">
                    {object && <span title={object.label}>{object.emoji}</span>}
                    {isAgent && (
                      <motion.div layout className="world-cell__agent">
                        🧠
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="legend">🧠 agent · 🍎 food · 🐺 threat · 🏠 shelter · ✨ novelty</p>
          </section>

          <section className="column-stack">
            <div className="panel">
              <h2>Body input</h2>
              <div className="stack">
                <Slider label="Hunger" value={agent.hunger} onChange={(value) => setAgent({ ...agent, hunger: value })} />
                <Slider label="Fear" value={agent.fear} onChange={(value) => setAgent({ ...agent, fear: value })} />
                <Slider label="Energy" value={agent.energy} onChange={(value) => setAgent({ ...agent, energy: value })} />
                <Slider label="Pain" value={agent.pain} onChange={(value) => setAgent({ ...agent, pain: value })} />
                <Slider
                  label="Curiosity"
                  value={agent.curiosity}
                  onChange={(value) => setAgent({ ...agent, curiosity: value })}
                />
              </div>
            </div>

            <div className="panel">
              <h2>Calculated emotional state</h2>
              <div className="stack">
                <Bar label="Hunger pressure" value={emotion.hungerPressure} />
                <Bar label="Threat pressure" value={emotion.threatPressure} />
                <Bar label="Energy pressure" value={emotion.energyPressure} />
                <Bar label="Curiosity pressure" value={emotion.curiosityPressure} />
                <Bar label="Comfort" value={emotion.comfort} />
              </div>
            </div>
          </section>

          <section className="column-stack">
            <div className="panel">
              <h2>Object model / attention</h2>
              <div className="stack">
                {objectModel.map((obj) => (
                  <div key={obj.id} className="list-card">
                    <div className="list-card__emoji">{obj.emoji}</div>
                    <div className="list-card__body">
                      <div className="list-card__row">
                        <span>{obj.label}</span>
                        <span>salience {obj.salience}</span>
                      </div>
                      <div className="list-card__meta">distance {obj.distance}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <h2>Predicted futures</h2>
              <div className="stack">
                {rankedActions.map((result, index) => (
                  <div key={result.action.name} className={`future-card ${index === 0 ? "future-card--best" : ""}`}>
                    <div className="list-card__row">
                      <span>
                        {index + 1}. {result.action.name}
                      </span>
                      <span>{result.score.toFixed(1)}</span>
                    </div>
                    <div className="future-card__meta">{result.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <section className="panel report-panel">
          <h2>Conscious report</h2>
          <p className="report-copy">"{report}"</p>
          <p className="report-note">
            Current best action: <strong>{rankedActions[0].action.name}</strong>. This is not proof of consciousness; it is a
            visible implementation of the proposed loop.
          </p>
        </section>
      </div>
    </div>
  );
}
