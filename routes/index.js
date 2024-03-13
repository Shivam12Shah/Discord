var express = require('express');
var router = express.Router();
const passport = require("passport")
const upload = require("./multer")
const GoogleStrategy = require('passport-google-oidc');
require('dotenv').config()
const userModel = require("./users")
const serverModel = require("./servers");
const bodyParser = require('body-parser');
const textChannleModel = require("./textchannle")
router.use(bodyParser.json());

// google statergy

var ImageKit = require("imagekit");

const fs = require("fs");
const { log } = require('console');
var imagekit = new ImageKit({
  publicKey: process.env['public_key'],
  privateKey: process.env['private_key'],
  urlEndpoint: process.env['urlEndpoint']
});

router.get('/login', function (req, res, next) {
  return res.render('login');
})

passport.use(new GoogleStrategy({
  clientID: process.env['GOOGLE_CLIENT_ID'],
  clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  callbackURL: '/oauth2/redirect/google',
  scope: ['profile', 'email']
}, async function verify(issuer, profile, cb) {
  // console.log(profile);

  let user = await userModel.findOne({ email: profile.emails[0].value })

  if (user) {
    return cb(null, user)
  }

  let newUser = await userModel.create({
    name: profile.displayName,
    email: profile.emails[0].value

  })
  // await newUser.save()
  return cb(null, newUser)

}));

router.get('/login/federated/google', passport.authenticate('google'));

router.get('/oauth2/redirect/google', passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

router.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    return res.redirect('/login');
  });
});

router.get('/', async function (req, res, next) {
  // console.log(req.user);
  if (!req.user) {
    return res.redirect("/login")
  }
  const user = await userModel.findById(req.user.id).populate("servers").populate("following")
  const messgaperson = await userModel.findById(req.user.id).populate('following')


  const servers = await serverModel.find()

  let creteserver = []
  servers.filter(single=>{
    if(user.following.indexOf(single.servercreator)){
      creteserver.push(single)
    }
  })
  // console.log(creteserver);
  
return res.render('index', { user, messgaperson, creteserver});
});

router.post('/profile', isLoggedIn, upload.single('image'), async function (req, res, next) {
  // const user = await userModel.findById(req.user.id)

  fs.readFile(req.file.path, function (err, data) {
    // console.log(data);
    if (err) throw err; // Fail if the file can't be read.
    imagekit.upload({
      file: data, //required
      fileName: req.file.filename, //required
      tags: ["tag1", "tag2"]
    },async function (error, result) {
      if (error) console.log(error);
      else {
        var users = await userModel.findOneAndUpdate({_id:req.user.id},{profilepic:result.url})
        return res.redirect("/")
      
      };
    });
  });
  // user.profilepic = req.file.filename
})

router.get("/sendfriends/:name", isLoggedIn, async function (req, res) {
  // console.log(req.user.id);
  const serchname = req.params.name
  const nre = await userModel.find({ _id: { $nin: [req.user.id] } });
  // console.log(nre);
  const nreuser = nre.filter((charcter) => {
    return charcter.name.includes(serchname);

  })
  // console.log(nreuser);
  return res.json(nreuser)
})

router.get("/addfriends/:name", isLoggedIn, async function (req, res) {
  const user = await userModel.findById(req.user.id);

  const request = await userModel.findById(req.params.name)
  if (!request.follower.includes(user._id)) {
    request.follower.push(user._id)
    user.following.push(request._id)
    await user.save()
    await request.save()
  }
  // console.log( user, request);

  return res.json(user)
})

router.get("/remove/:name", isLoggedIn, async function (req, res) {
  const user = await userModel.findById(req.user.id);

  const request = await userModel.findById(req.params.name)
  if (request.follower.includes(user._id)) {
    request.follower.remove(user._id)
    user.following.remove(request._id)
    await user.save()
    await request.save()
  }
  // console.log( user, request);

  return res.json(user)
})
router.get("/channle/:server", isLoggedIn, async (req, res, next) => {
 
  if (!req.user) {
    return res.redirect("/login")
  }
  const user = await userModel.findById(req.user.id).populate("servers").populate("following")
  // console.log(req.params.server);
  const server = await serverModel.findById(req.params.server).populate("textchannels")
  // console.log(server);

  const servers = await serverModel.find()

  let creteserver = []
  servers.filter(single=>{
    if(user.following.indexOf(single.servercreator)){
      creteserver.push(single)
    }
  })
  // console.log(creteserver)
  // console.log(creteserver);
  return res.render(`channle`, { user, server, creteserver });
})



router.post("/createserver", isLoggedIn, upload.single('img'), async (req, res, next) => {
  const user = await userModel.findById(req.user.id)


  fs.readFile(req.file.path, function (err, data) {
    // console.log(data);
    if (err) throw err; // Fail if the file can't be read.
    imagekit.upload({
      file: data, //required
      fileName: req.file.filename, //required
      tags: ["tag1", "tag2"]
    },async function (error, result) {
      if (error) console.log(error);
      else {
        var user = await userModel.findOneAndUpdate({_id: req.user.id},{profilepic:result.url})
        
        const baby = await serverModel.create({
          serverimg: result.url,
          servername: req.body.servername,
          servercreator: user._id
        })
        user.servers.push(baby._id)
        await user.save();
        return res.redirect(`/channle/${baby._id}`)
      };
    });
  })
  

})
// var currentRoute = window.location.pathname;
router.post("/createchannle", isLoggedIn, async (req, res, next) => {

  var channleid = req.headers.referer;
  channleid = channleid.split("/")
  channleid = channleid[channleid.length - 1]
  // console.log(channleid);
  const server = await serverModel.findById(channleid)

  const newTextChannle = await textChannleModel.create({
    channlename: req.body.channlename,
    channledis: req.body.channledis,
    admin: req.user.id
  })

  server.textchannels.push(newTextChannle._id)
  await server.save()

  return res.redirect(`/channle/${channleid}`)
})

router.get("/addintochannle", isLoggedIn, async (req, res) => {


  var serverid = req.headers.referer;
  serverid = serverid.split("/")
  serverid = serverid[serverid.length - 1]
  // console.log("server ki is = " + serverid);

  // const server = await serverModel.findById(channleid)

  const details = req.query
  // console.log(details);

  const channle = await textChannleModel.findById(details.channle)

  if (!channle.members.includes(details.user)) {
    channle.members.push(details.user)
    await channle.save()
    return res.json(channle)

  }
  else {
    return res.json(channle)
  }
})


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  else {
    return res.redirect('/login')
  }
}


module.exports = router;
