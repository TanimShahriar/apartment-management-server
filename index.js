const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require("jsonwebtoken")
require('dotenv').config()
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6mxxl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const apartmentCollection = client.db('hillApartment').collection('apartments')
    const agreementCollection = client.db('hillApartment').collection('agreement')
    const userCollection = client.db('bistroBoss').collection('users')



    //jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h"
      });
      res.send({ token });
    })

    //middlewares
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" })
      }
      // next();
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "unauthorized access" })
        }
        req.decoded = decoded;
        next();
      })
      // if (!token) {
      //   return res.status(401).send({ message: "forbidden access" })
      // }
    }
    //use verify admin after verify token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" })
      }
      next();
    }


    //user related api

    app.post("/users", async (req, res) => {
      const user = req.body;
      //insert email if user doesn't exist
      //we can do this in many ways (1. unique email, 2. upsert, 3. checking if email exist)
      const query = { email: user.email }
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({ message: "User already exist", insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })



    //menu related api
    app.get("/apartments", async (req, res) => {
      const cursor = apartmentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // app.get("/review", async (req, res) => {
    //   const cursor = reviewCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // })


    //agreement related
    app.get("/agreement", async (req, res) => {
      const result = await agreementCollection.find().toArray();
      res.send(result);
    })


    app.post("/agree", async (req, res) => {
      const newAssignment = req.body;
      console.log(newAssignment);
      const result = await agreementCollection.insertOne(newAssignment);
      res.send(result);
    })

    //cart related api




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Apartment boss is sitting')
})

app.listen(port, () => {
  console.log(`Apartment is sitting on port: ${port}`)
})