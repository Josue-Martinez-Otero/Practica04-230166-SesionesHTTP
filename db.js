import mongoose from'mongoose';

mongoose.connect('mongodb+srv://josuemartinez:230166@josuemart.xdalg.mongodb.net/?retryWrites=true&w=majority&appName=JosueMart.')
.then((db)=>(console.log("Connected to MongoDB")))
    .catch((error)=>console.log(error));
    
    export default mongoose;