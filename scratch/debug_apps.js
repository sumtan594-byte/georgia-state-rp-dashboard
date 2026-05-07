const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db("gsrp_staff");
    const apps = await db.collection("applications").find().sort({ submittedAt: -1 }).limit(1).toArray();
    console.log('Latest App:', JSON.stringify(apps[0], null, 2));
    
    const types = await db.collection("application_types").find().toArray();
    console.log('App Types:', JSON.stringify(types, null, 2));
  } finally {
    await client.close();
  }
}

check();
