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

        app.delete('/artworks/:id', async (req, res) => {
            const { id } = req.params;
            const result = await artCollection.deleteOne({ _id: new ObjectId(id) })

            res.send(result);
        })


        app.get('/latest-artworks', async (req, res) => {
            const result = await artCollection.find().sort({
                createdAt: 'asc'
            }).limit(6).toArray()
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