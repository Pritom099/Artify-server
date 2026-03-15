const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = 3000
app.use(cors())
app.use(express.json())


const uri = "mongodb+srv://artifyUser:iYiEm9XEjb1uSZUW@cluster0.q6wdesq.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

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
            const result = await artCollection.insertOne(data);
            res.send(result)
        })

        app.put('/artworks/:id', async (req, res) => {
            const { id } = req.params
            const data = req.body
            const objectId = new ObjectId(id)
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

        app.delete('/artworks/:id', async (req, res) => {
            const { id } = req.params;
            const result = await artCollection.deleteOne({ _id: new ObjectId(id) })

            res.send(result);
        })


        app.get('/latest-artworks', async (req, res) => {
            const result = await artCollection.find().sort({ createdAt: -1 }).limit(6).toArray()
            res.send(result)
        })

        app.get('/my-gallery', async (req, res) => {
            const email = req.query.email
            const result = await artCollection.find({ artistEmail: email }).toArray()
            res.send(result);
        })

        app.post('/favourites', async (req, res) => {
            const data = req.body;
            const result = await favouritCollection.insertOne(data)
            res.send(result)
        })

        app.get('/favourites', async (req, res) => {
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