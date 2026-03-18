module.exports = {
  apps : [{
    name   : "postit",
    script : "./dist/server.js",
    env_production : {
	NODE_ENV: "production"
    }
  }]
}
