const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");
require("dotenv").config()
const serviceAccount = require("./servicekey.json");
const app = express()
const port = process.env.PORT || 3000
app.use(cors());

app.use(express.json())


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.q6wdesq.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const verifyToken = async (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).send({
            message: "Unauthorized access: Token missing"
        });
    }

    const token = authorization.split(" ")[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next();
    }
    catch (error) {
        return res.status(401).send({
            message: "Unauthorized access"
        });
    }
};


async function run() {
    try {
         await client.connect();

        const db = client.db('artify')
        const artCollection = db.collection('artworks')
        const favouritCollection = db.collection('favourites')

        app.get('/artworks', async (req, res) => {
            const result = await artCollection.find().toArray()
            res.send(result)
        })

        app.get('/artworks/:id', async (req, res) => {
            const { id } = req.params
            const objectId = new ObjectId(id)

            const result = await artCollection.findOne({ _id: objectId })
            res.send(result)
        })

        app.post('/artworks', async (req, res) => {
            const data = req.body;
            console.log(data);
            data.createdAt = new Date();
            const result = await artCollection.insertOne(data);
            res.send(result)
        })

        app.put('/artworks/:id', verifyToken, async (req, res) => {
            const { id } = req.params
            const data = req.body
            const objectId = new ObjectId(id)

            const artwork = await artCollection.findOne({ _id: objectId });

            if (artwork.artistEmail !== req.decoded.email) {
                return res.status(403).send({
                    message: "Forbidden access"
                });
            }

            const filter = { _id: objectId }
            const update = {
                $set: data
            }
            const result = await artCollection.updateOne(filter, update)
            res.send(result)
        })

        app.patch('/artworks/like/:id', async (req, res) => {
            const { id } = req.params;

            const result = await artCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { likes: 1 } }
            );

            res.send(result);
        });

        app.patch('/artworks/view/:id', async (req, res) => {
            const { id } = req.params;

            const result = await artCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { views: 1 } }
            );

            res.send(result);
        });

        app.delete('/artworks/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const artwork = await artCollection.findOne({
                _id: new ObjectId(id)
            });

            if (!artwork) {
                return res.status(404).send({ message: "Artwork not found" });
            }

            if (artwork.artistEmail !== req.decoded.email) {
                return res.status(403).send({
                    message: "Forbidden access"
                });
            }
            const result = await artCollection.deleteOne({ _id: new ObjectId(id) })

            res.send(result);
        })


        app.get('/latest-artworks', async (req, res) => {
            try {
                const result = await artCollection
                    .find({})
                    .sort({ _id: -1 })
                    .limit(6)
                    .toArray();

                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: "Server error" });
            }
        });

        app.get('/my-gallery', verifyToken, async (req, res) => {
            const email = req.query.email
            const result = await artCollection.find({ artistEmail: email }).toArray()
            res.send(result);
        })

        app.post('/favourites', async (req, res) => {
            const data = req.body;
            const result = await favouritCollection.insertOne(data)
            res.send(result)
        })

        app.get('/favourites', verifyToken, async (req, res) => {
            const email = req.query.email;
            const result = await favouritCollection.find({ userEmail: email }).toArray();

            res.send(result);
        });

        app.delete('/favourites/:id', async (req, res) => {
            const { id } = req.params;
            const result = await favouritCollection.deleteOne({
                _id: new ObjectId(id)
            });

            res.send(result);

        });

        app.get('/search', async (req, res) => {
            const search_text = req.query.search
            const result = await artCollection.find({ title: { $regex: search_text, $options: "i" } }).toArray()
            res.send(result)
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!")
    }
    finally {

    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Server is running Fine!')
})

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
})