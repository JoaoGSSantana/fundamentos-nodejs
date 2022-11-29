const express = require("express");
const { v4: uuidV4 } = require("uuid");

const app = express();

app.use(express.json());

const costumers = [];

//Middleware
function verifyIfAccountExists(request, response, next) {
  const { cpf } = request.headers;

  const account = costumers.find((account) => account.cpf === cpf);

  if (!account) {
    return response.status(404).json({ error: "Account not found." });
  }

  request.costumer = account;

  next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") return (acc += operation.amount);
    else return (acc -= operation.amount);
  }, 0);

  return balance;
}

app.post("/account", (request, response) => {
  const { name, cpf } = request.body;

  const accountAlreadyExists = costumers.some((account) => account.cpf === cpf);

  if (accountAlreadyExists) {
    return response.status(400).json({ error: "Account already exists!" });
  }

  try {
    costumers.push({
      id: uuidV4(),
      name,
      cpf,
      statement: [],
    });

    return response.status(201).send("Account created successfully.");
  } catch (error) {
    return response
      .status(500)
      .json({ error: "Failed to create account, try again." });
  }
});

app.get("/account", verifyIfAccountExists, (request, response) => {
  const { costumer } = request;

  return response.json({ account: costumer });
});

app.put("/account", verifyIfAccountExists, (request, response) => {
  const { name } = request.body;

  const { costumer } = request;

  costumer.name = name;

  return response.status(201).send();
});

app.delete("/account", verifyIfAccountExists, (request, response) => {
  const { costumer } = request;

  costumers.splice(costumer, 1);
  return response.status(200).json({ costumers });
});

app.get("/statement", verifyIfAccountExists, (request, response) => {
  const { costumer } = request;

  return response.json({ statement: costumer.statement });
});

app.get("/statement/date", verifyIfAccountExists, (request, response) => {
  const { costumer } = request;

  const { date } = request.query;

  const dateFormatted = new Date(date + " 00:00");

  const statement = costumer.statement.filter(
    (operation) =>
      operation.created_at.toDateString() ===
      new Date(dateFormatted).toDateString()
  );

  return response.json({ statement: statement });
});

app.post("/deposit", verifyIfAccountExists, (request, response) => {
  const { description, amount } = request.body;
  const { costumer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  costumer.statement.push(statementOperation);

  return response.status(201).send();
});

app.post("/withdraw", verifyIfAccountExists, (request, response) => {
  const { amount } = request.body;
  const { costumer } = request;

  const balance = getBalance(costumer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Insufficient funds!" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  costumer.statement.push(statementOperation);

  return response.status(201).send();
});

app.get("/balance", verifyIfAccountExists, (request, response) => {
  const { costumer } = request;

  const balance = getBalance(costumer.statement);

  return response.json({ balance });
});

app.listen(3333);
