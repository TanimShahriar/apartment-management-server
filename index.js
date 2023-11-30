const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require("jsonwebtoken")
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
    const userCollection = client.db('hillApartment').collection('users')
    const memberCollection = client.db('hillApartment').collection('members')
    const rejectUserCollection = client.db('hillApartment').collection('rejectedUsers')
    const announcementCollection = client.db('hillApartment').collection('adminAnnouncement')
    const paymenttCollection = client.db('hillApartment').collection('create-payment-intent')
    const paymentCollection = client.db('hillApartment').collection('payments')
    const couponCollection = client.db('hillApartment').collection('coupons')



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
    //use verify member after verify token
    const verifyMember = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isMember = user?.role === "member";
      if (!isMember) {
        return res.status(403).send({ message: "Forbidden access" })
      }
      next();
    }

    const verifyUser = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isUser = user?.role === "user";
      if (!isUser) {
        return res.status(403).send({ message: "Forbidden access" })
      }
      next();
    }


    //user related api


    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })



    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === "admin"
      }
      res.send({ admin })
    })

    app.get("/users/member/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query)
      let members = false;
      if (user) {
        members = user?.role === "member"
      }
      res.send({ members })
    })

    app.get("/users/user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query)
      let users = false;
      if (user) {
        users = user?.role == "user"
      }
      res.send({ users })
    })


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



    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: "admin",
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })


    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })



    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedUsers = req.body;
      const usersRole = {
        $set: {
          role: updatedUsers.role
        }
      }

      const result = await userCollection.updateOne(filter, usersRole, options);
      res.send(result);
    })


    //apartments related api
    app.get("/apartments", verifyToken, async (req, res) => {
      const cursor = apartmentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    app.delete("/apartments/:apartmentNo", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await apartmentCollection.deleteOne(query);
      res.send(result);
    })





    //agreement related
    app.get("/agreement", async (req, res) => {
      const email = req.query.email;
      // const query = { email: email };
      const result = await agreementCollection.find().toArray();
      res.send(result);
    })





    app.post("/agreement", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await agreementCollection.insertOne(data);
      res.send(result);
    })



    app.delete("/agreement/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await agreementCollection.deleteOne(query);
      res.send(result);
    })


    //member related api
    app.post("/members", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await memberCollection.insertOne(data);
      res.send(result);
    })

    app.get("/members", async (req, res) => {
      const cursor = memberCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.delete("/members/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await memberCollection.deleteOne(query);
      res.send(result);
    })





    //rejected user collection

    app.post("/rejectedUsers", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await rejectUserCollection.insertOne(data);
      res.send(result);
    })

    app.get("/rejectedUsers", async (req, res) => {
      const cursor = rejectUserCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })



    //announcement collection
    app.post("/adminAnnouncement", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await announcementCollection.insertOne(data);
      res.send(result);
    })

    app.get("/adminAnnouncement", async (req, res) => {
      const cursor = announcementCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    //payment related code

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);


      //delete data
      console.log("Payment info", payment)
      const query = {
        _id: {
          $in: payment.agreementIds.map(id => new ObjectId(id))
        }
      }
      const deleteResult = await memberCollection.deleteOne(query);
      res.send({ paymentResult, deleteResult });
    })

    app.get("/payments", async (req, res) => {
      const cursor = paymentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/payments/:id", async (req, res) => {
      const cursor = paymentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    //coupons related api
    app.post("/coupons", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await couponCollection.insertOne(data);
      res.send(result);
    })

    app.get("/coupons", async (req, res) => {
      const cursor = couponCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.delete("/coupons/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await couponCollection.deleteOne(query);
      res.send(result);
    })






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