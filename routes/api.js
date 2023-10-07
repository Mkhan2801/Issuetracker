'use strict';

require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectID = require('mongodb').ObjectId;

async function myDB(callback) {
  const URI = process.env.MONGO_URI; // Declare MONGO_URI in your .env file
  const client = new MongoClient(URI, {});

  try {
    // Connect to the MongoDB cluster
    await client.connect();

    // Make the appropriate DB calls
    await callback(client);

  } catch (e) {
    // Catch any errors
    console.error(e);
  }
}




module.exports = function (app) {

  app.route('/api/issues/:project')

    .get(function (req, res) {
      let project = req.params.project;
      let query = req.query;
      myDB(async client => {
        const myDataBase = await client.db('test').collection(project);
        if (!query) {
          return myDataBase.find().toArray().then((data) => {
            res.json(data)
          });
        }
        myDataBase.find(query).toArray().then((data) => {
          res.json(data)
        });
      })
    })

    .post(function (req, res) {
      let project = req.params.project;
      let input = req.body;
      if (!input.issue_title || !input.issue_text || !input.created_by) { return res.json({ error: 'required field(s) missing' }) }

      let saveData = {
        issue_title: input.issue_title,
        issue_text: input.issue_text,
        created_by: input.created_by,
        assigned_to: input.assigned_to || "",
        status_text: input.status_text || "",
        open: input.open || true,
        created_on: new Date(),
        updated_on: new Date()
      };
      myDB(async client => {
        const myDataBase = await client.db('test');
        myDataBase.collection(project).insertOne(saveData).then((user) => {
          myDataBase.collection(project).findOne({ "_id": user.insertedId })
            .then((data, err) => { res.json(data) })
        })
      })
    })

    .put(function (req, res) {
      let project = req.params.project;
      let input = req.body;
      if (!input._id) { return res.json({ error: 'missing _id' }) }
      let updateData = Object.fromEntries(Object.entries(input).filter(([_, v]) => v.length > 0));
      delete updateData._id
      function isEmpty(obj) {
        for (const prop in obj) {
          if (Object.hasOwn(obj, prop)) {
            return false;
          }
        }
        return true;
      }

      if (isEmpty(updateData)) { return res.json({ error: 'no update field(s) sent', '_id': input._id }) }

      myDB(async client => {
        const myDataBase = await client.db('test');
        myDataBase.collection(project).updateOne({ "_id": new ObjectID(input._id) }, { "$set": { ...updateData, updated_on: new Date() } })
          .then((data, err) => {
            if (data.modifiedCount == 1) {
              return res.json({
                result: 'successfully updated', _id: input._id
              })
            }
            return res.json({ error: "could not update", "_id": input._id })

          })

      })
    })

    .delete(function (req, res) {
      let project = req.params.project;
      let input = req.body;
      if (!input._id) { return res.json({ error: 'missing _id' }) }
      myDB(async client => {
        const myDataBase = await client.db('test');
        myDataBase.collection(project).deleteOne({ "_id": new ObjectID(input._id) })
          .then((data, err) => {
            if (data.deletedCount === 1) { return res.json({ result: "successfully deleted", _id: input._id }) }
            else { res.json({ error: 'could not delete', _id: input._id }) }
          })
      })

    });

};