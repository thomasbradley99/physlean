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

const sliderKeys = [
  ["hunger", "Hunger"],
  ["fear", "Fear"],
  ["energy", "Energy"],
  ["pain", "Pain"],
  ["curiosity", "Curiosity"],
];

const emotionKeys = [
  ["hungerPressure", "Hunger pressure"],
  ["threatPressure", "Threat pressure"],
  ["energyPressure", "Energy pressure"],
  ["curiosityPressure", "Curiosity pressure"],
  ["comfort", "Comfort"],
];

let agent = {
  position: { x: 3, y: 3 },
  hunger: 78,
  fear: 62,
  energy: 55,
  pain: 10,
  curiosity: 35,
};

let steps = 0;

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

function buildObjectModel(currentAgent, objects) {
  return objects
    .map((obj) => {
      const d = distance(currentAgent.position, obj.position);
      let baseSalience = proximityScore(currentAgent.position, obj);

      if (obj.kind === "food") baseSalience += currentAgent.hunger * 0.85;
      if (obj.kind === "threat") baseSalience += currentAgent.fear * 1.1 + currentAgent.pain * 0.4;
      if (obj.kind === "shelter") baseSalience += currentAgent.fear * 0.75 + (100 - currentAgent.energy) * 0.25;
      if (obj.kind === "novelty") baseSalience += currentAgent.curiosity * 0.9;

      return {
        ...obj,
        distance: d,
        salience: clamp(Math.round(baseSalience)),
      };
    })
    .sort((a, b) => b.salience - a.salience);
}

function calculateEmotion(currentAgent, objects, position = currentAgent.position) {
  const food = nearestObject(position, objects, "food");
  const threat = nearestObject(position, objects, "threat");
  const shelter = nearestObject(position, objects, "shelter");
  const novelty = nearestObject(position, objects, "novelty");

  const foodNear = food ? proximityScore(position, food) : 0;
  const threatNear = threat ? proximityScore(position, threat) : 0;
  const shelterNear = shelter ? proximityScore(position, shelter) : 0;
  const noveltyNear = novelty ? proximityScore(position, novelty) : 0;

  return {
    hungerPressure: clamp(currentAgent.hunger + (100 - foodNear) * 0.12),
    threatPressure: clamp(currentAgent.fear + threatNear * 0.65 + currentAgent.pain * 0.35 - shelterNear * 0.25),
    energyPressure: clamp(100 - currentAgent.energy),
    curiosityPressure: clamp(currentAgent.curiosity + noveltyNear * 0.45),
    comfort: clamp(100 - currentAgent.hunger * 0.25 - currentAgent.fear * 0.3 - currentAgent.pain * 0.35 + shelterNear * 0.25),
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

function simulateAction(action, currentAgent, objects) {
  const nextPosition = clampPos({
    x: currentAgent.position.x + action.dx,
    y: currentAgent.position.y + action.dy,
  });

  const nowEmotion = calculateEmotion(currentAgent, objects, currentAgent.position);
  const nextEmotion = calculateEmotion(currentAgent, objects, nextPosition);

  const food = nearestObject(nextPosition, objects, "food");
  const threat = nearestObject(nextPosition, objects, "threat");
  const shelter = nearestObject(nextPosition, objects, "shelter");
  const novelty = nearestObject(nextPosition, objects, "novelty");

  const foodGain = food ? proximityScore(nextPosition, food) * (currentAgent.hunger / 100) : 0;
  const safetyGain = shelter ? proximityScore(nextPosition, shelter) * (currentAgent.fear / 100) : 0;
  const noveltyGain = novelty ? proximityScore(nextPosition, novelty) * (currentAgent.curiosity / 100) : 0;
  const damageRisk = threat ? proximityScore(nextPosition, threat) * (currentAgent.fear / 100) : 0;
  const energyCost = action.name === "Wait" ? 0 : 5 + (100 - currentAgent.energy) * 0.04;

  const score =
    emotionalUtility(nextEmotion) -
    emotionalUtility(nowEmotion) +
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
    explanation: explanation.length ? explanation.join("; ") : "small expected change",
  };
}

function generateReport(currentAgent, objectModel, rankedActions) {
  const top = objectModel[0];
  const best = rankedActions[0];
  const food = objectModel.find((obj) => obj.kind === "food");
  const threat = objectModel.find((obj) => obj.kind === "threat");

  const conflict =
    currentAgent.hunger > 65 &&
    currentAgent.fear > 65 &&
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

function handleResourceChange(position, objects, kind, radius, delta) {
  const nearest = nearestObject(position, objects, kind);
  if (!nearest) return 0;
  return distance(position, nearest.position) <= radius ? delta : 0;
}

function getDerivedState() {
  const objectModel = buildObjectModel(agent, initialObjects);
  const rankedActions = actions.map((action) => simulateAction(action, agent, initialObjects)).sort((a, b) => b.score - a.score);
  const emotion = calculateEmotion(agent, initialObjects);
  const report = generateReport(agent, objectModel, rankedActions);

  return { objectModel, rankedActions, emotion, report };
}

function render() {
  const { objectModel, rankedActions, emotion, report } = getDerivedState();

  document.getElementById("steps-label").textContent = `step ${steps}`;

  const worldGrid = document.getElementById("world-grid");
  worldGrid.style.gridTemplateColumns = `repeat(${GRID_SIZE}, minmax(0, 1fr))`;
  worldGrid.innerHTML = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const x = index % GRID_SIZE;
    const y = Math.floor(index / GRID_SIZE);
    const object = initialObjects.find((obj) => obj.position.x === x && obj.position.y === y);
    const isAgent = agent.position.x === x && agent.position.y === y;

    return `
      <div class="world-cell">
        ${object ? `<span title="${object.label}">${object.emoji}</span>` : ""}
        ${isAgent ? '<div class="world-cell__agent">🧠</div>' : ""}
      </div>
    `;
  }).join("");

  document.getElementById("body-input").innerHTML = sliderKeys
    .map(
      ([key, label]) => `
        <label class="slider">
          <div class="slider__label">
            <span>${label}</span>
            <span>${agent[key]}</span>
          </div>
          <input type="range" min="0" max="100" value="${agent[key]}" data-slider="${key}" />
        </label>
      `,
    )
    .join("");

  document.getElementById("emotion-bars").innerHTML = emotionKeys
    .map(
      ([key, label]) => `
        <div class="meter">
          <div class="meter__label">
            <span>${label}</span>
            <span>${Math.round(emotion[key])}</span>
          </div>
          <div class="meter__track">
            <div class="meter__fill" style="width: ${clamp(emotion[key])}%"></div>
          </div>
        </div>
      `,
    )
    .join("");

  document.getElementById("object-model").innerHTML = objectModel
    .map(
      (obj) => `
        <div class="list-card">
          <div class="list-card__emoji">${obj.emoji}</div>
          <div class="list-card__body">
            <div class="list-card__row">
              <span>${obj.label}</span>
              <span>salience ${obj.salience}</span>
            </div>
            <div class="list-card__meta">distance ${obj.distance}</div>
          </div>
        </div>
      `,
    )
    .join("");

  document.getElementById("futures").innerHTML = rankedActions
    .map(
      (result, index) => `
        <div class="future-card ${index === 0 ? "future-card--best" : ""}">
          <div class="list-card__row">
            <span>${index + 1}. ${result.action.name}</span>
            <span>${result.score.toFixed(1)}</span>
          </div>
          <div class="future-card__meta">${result.explanation}</div>
        </div>
      `,
    )
    .join("");

  document.getElementById("report-copy").textContent = `"${report}"`;
  document.getElementById("report-note").innerHTML = `Current best action: <strong>${rankedActions[0].action.name}</strong>. This is not proof of consciousness; it is a visible implementation of the proposed loop.`;
}

function step() {
  const { rankedActions } = getDerivedState();
  const best = rankedActions[0];

  agent = {
    ...agent,
    position: best.nextPosition,
    hunger: clamp(agent.hunger + 2 + handleResourceChange(best.nextPosition, initialObjects, "food", 0, -45)),
    fear: clamp(agent.fear + handleResourceChange(best.nextPosition, initialObjects, "shelter", 0, -25)),
    energy: clamp(agent.energy - (best.action.name === "Wait" ? 1 : 4)),
    pain: clamp(agent.pain + handleResourceChange(best.nextPosition, initialObjects, "threat", 1, 12) - 2),
    curiosity: clamp(agent.curiosity + 1),
  };
  steps += 1;
  render();
}

function resetScenario(type) {
  const scenarios = {
    hungry: { position: { x: 3, y: 3 }, hunger: 92, fear: 20, energy: 70, pain: 0, curiosity: 25 },
    afraid: { position: { x: 3, y: 3 }, hunger: 45, fear: 92, energy: 45, pain: 20, curiosity: 15 },
    conflict: { position: { x: 5, y: 3 }, hunger: 90, fear: 88, energy: 50, pain: 15, curiosity: 20 },
    curious: { position: { x: 5, y: 7 }, hunger: 20, fear: 15, energy: 80, pain: 0, curiosity: 90 },
  };

  agent = scenarios[type];
  steps = 0;
  render();
}

document.addEventListener("click", (event) => {
  const scenario = event.target.getAttribute("data-scenario");
  if (scenario) {
    resetScenario(scenario);
    return;
  }

  if (event.target.hasAttribute("data-step")) {
    step();
  }
});

document.addEventListener("input", (event) => {
  const key = event.target.getAttribute("data-slider");
  if (!key) return;

  agent = {
    ...agent,
    [key]: Number(event.target.value),
  };
  render();
});

render();
