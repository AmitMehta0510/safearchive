const express = require("express");
const userRouter = require("./user.router");
const repoRouter = require("./repo.router");
const issueRouter = require("./issue.router");
const prRouter = require("./pr.router");
const notificationRouter = require("./notification.router");
const webhookRouter = require("./webhook.router");
const actionRouter = require("./action.router");
const releaseRouter = require("./release.router");

const mainRouter = express.Router();

mainRouter.use(userRouter);
mainRouter.use(repoRouter);
mainRouter.use(issueRouter);
mainRouter.use(prRouter);
mainRouter.use(notificationRouter);
mainRouter.use(webhookRouter);
mainRouter.use(actionRouter);
mainRouter.use(releaseRouter);

mainRouter.get("/", (req, res) => {
  res.send("Hello, this is your SafeArchive Git Server API!");
});

module.exports = mainRouter;