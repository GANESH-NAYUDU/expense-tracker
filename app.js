//HELLO
const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const port = process.env.PORT || 4000;

const app = express();
app.use(express.json());

dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(port, () => {
      console.log("SERVER RUNNING SUCCESFULLY......");
    });
  } catch (e) {
    console.log(`DB ERROR ${e.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

///JWT AUTHENTICATION
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send(error);
      } else {
        next();
      }
    });
  }
};
///

app.get("/",(req,res) => {
  res.send("Hii this is an expense tracking app")
}
)

//SIGNUP POST API
app.post("/signup", async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT username FROM usertable WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        usertable (username,password,createdAt) 
      VALUES 
        (
          '${username}', 
          '${hashedPassword}',
           date("now")
        )`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    response.status(200);
    response.send({ message: "user created", userId: newUserId });
  } else {
    response.status = 400;
    response.send({ message: "user already exits" });
  }
});
//

//LOGIN POST API

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM usertable WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send({ message: "Invalid User" });
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: dbUser.username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({jwtToken: jwtToken, userId: dbUser.userId, });
    } else {
      response.status(400);
      response.send({ message: "Invalid Password" });
    }
  }
});


//Add a new transaction API

app.post("/transactions",authenticateToken, async (req,res) => {
  const {userId,type,amount,date,description,category} = req.body
  console.log(type) 
  if (type === "income" || type === "expense") {
    await db.run(` INSERT INTO transactions(userId,type,amount,date,description,category)
            VALUES (${userId},"${type}","${amount}","${date}","${description}","${category}")
      `)
      res.send("Transaction added successfully")
     
  }
  else {
    res.send("Invalid Type")
  }
})


//GET ALL TRANSACTIONS API

app.get("/transactions",async (req,res) => {
  const allTransactions = await db.all(`
      SELECT * FROM transactions
    ` )
    res.send(allTransactions)   
  
})





