const express = require("express");
const userRouter = require("./user.router");
const repoRouter = require("./repo.router");
const issueRouter = require("./issue.router");
const prRouter = require("./pr.router");
const notificationRouter = require("./notification.router");

const mainRouter = express.Router();

mainRouter.use(userRouter);
mainRouter.use(repoRouter);
mainRouter.use(issueRouter);
mainRouter.use(prRouter);
mainRouter.use(notificationRouter);

mainRouter.get("/", (req, res) => {
  res.send("Hello, this is your Git Server API!");
});

module.exports = mainRouter;
