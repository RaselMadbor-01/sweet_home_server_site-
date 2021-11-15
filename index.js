const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const { initializeApp } = require("firebase-admin/app");
const admin = require("firebase-admin");
require("dotenv").config();

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vkos1.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("server is Connectd");
});

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } finally {
    }
  }
  next();
}

async function run() {
  try {
    await client.connect();

    const database = client.db("sweetHomeData");
    const propertyCollection = database.collection("propertyData");
    const clientReviewCollection = database.collection("clientReviewData");
    const userBookingInfo = database.collection("userBookingInfo");
    const usersCollection = database.collection("users");

    //GET
    app.get("/allProperty", async (req, res) => {
      const cursor = propertyCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    //GET
    app.get("/allClientReview", async (req, res) => {
      const cursor = clientReviewCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    //GET
    app.get("/myOrders", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = userBookingInfo.find(query);
      const result = await cursor.toArray();
      res.json(result);
    });

    //GET
    app.get("/allOrders", async (req, res) => {
      const cursor = userBookingInfo.find({});
      const result = await cursor.toArray();
      res.json(result);
    });
    //GET
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    //POST
    app.post("/clientReview", async (req, res) => {
      const body = req.body;
      console.log(body);
      const result = await clientReviewCollection.insertOne(body);
      console.log(result);
      res.json(result);
    });

    //POST
    app.post("/bookingInfo", async (req, res) => {
      const body = req.body;
      const result = await userBookingInfo.insertOne(body);
      res.json(result);
    });

    //POST
    app.post("/users", async (req, res) => {
      const body = req.body;
      const result = await usersCollection.insertOne(body);
      res.json(result);
    });
    //POST
    app.post("/addProduct", async (req, res) => {
      const body = req.body;
      console.log(body);
      const result = await propertyCollection.insertOne(body);
      console.log(result);
      res.json(result);
    });

    //PUT
    app.put("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.json(result);
    });

    //PUT
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requestEmail = req.decodedEmail;
      if (requestEmail) {
        const requestAccount = await usersCollection.findOne({
          email: requestEmail,
        });
        if (requestAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "You do not have the access to make an admin" });
      }
    });
    //PUT
    app.put("/updateStatus/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) };
      console.log(query);
      const selectProduct = await userBookingInfo.findOne(query);
      console.log(selectProduct);
      if (selectProduct?.status === "pending") {
        const updateDoc = { $set: { status: "shipped" } };
        const result = await userBookingInfo.updateOne(query, updateDoc);
        res.json(result);
      } else if (selectProduct.status === "shipped") {
        const updateDoc = { $set: { status: "pending" } };
        const result = await userBookingInfo.updateOne(query, updateDoc);
        res.json(result);
      }
      res.json(selectProduct);
    });

    //DELETE
    app.delete("/deleteOrder/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userBookingInfo.deleteOne(query);
      res.json(result);
    });
    //DELETE
    app.delete("/deleteBookOrder/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userBookingInfo.deleteOne(query);
      res.json(result);
    });
    //DELETE
    app.delete("/deleteProperty/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await propertyCollection.deleteOne(query);
      res.json(result);
    });

    console.log("mongodb connect successfully");
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("server is connected at", port);
});
