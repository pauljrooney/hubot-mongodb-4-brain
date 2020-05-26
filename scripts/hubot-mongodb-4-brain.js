let mdb_client = require('mongodb').MongoClient;

module.exports = (robot) => {
    const MONGODB_URL = process.env.MONGODB_URL;

    mdb_client.connect(MONGODB_URL, (err, client) => {
        let db = client.db("tsbot");

        robot.logger.info("Connected to MongoDB.");
        robot.brain.on("close", () => {
            client.close();
        });
        robot.brain.setAutoSave(false);

        let cache = {};

        db.createCollection("brain", (err, collection) => {
            collection.find({}).toArray((err, docs) => {
                if(err) {
                    robot.logger.error(err);
                }
                data = {};

                for(doc in docs) {
                    let docContent = doc.content;
                    data[doc._id] = docContent;
                    cache[doc._id] = docContent;
                }

                robot.brain.mergeData(data);
                robot.brain.resetSaveInterval(10);
                robot.brain.setAutoSave(true);
            });
        });

        robot.brain.on("save", (data) => {
            db.collection("brain", (err, collection) => {
                for(const [key, value] of Object.entries(data)) {
                    if(cache[key] === value) {
                        return;
                    }

                    robot.logger.info(`Saving ${key} into brain...`);
                    cache[key] = value;
                    collection.updateOne({_id:key},{$set:{content:value}}, {upsert: true}, (err, res) => {
                        if(err) {
                            robot.logger.error(err);
                        }
                    });
                    return;
                }
            });
        });
    });
}