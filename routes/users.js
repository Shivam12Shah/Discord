const mongoose = require("mongoose")

mongoose.set("strictQuery", false)
// if true karenga to mai iske alaw aor kuch nahi daal sakta
// or ager false hai to mai bahut cuhc daat skat ahun isme
mongoose.connect("mongodb://127.0.0.1:27017/Discordrs")

var userSchema = mongoose.Schema({
  name:String,
  email:String,
  socketId:String,
  follower:[
    {
      type : mongoose.Schema.Types.ObjectId,
      ref:"user",autopopulate: true
    }
  ],
  following:[
    {
      type:mongoose.Schema.Types.ObjectId,
      ref:"user",autopopulate: true
    }
  ],
  profilepic:{
    default:"channels4_profile.jpg",
    type:String
  },
  servers:[
    {
      type : mongoose.Schema.Types.ObjectId,
      ref:"server",autopopulate: true
    }
  ],
})


module.exports = mongoose.model('user', userSchema)