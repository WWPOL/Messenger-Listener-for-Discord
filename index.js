require("dotenv").config();
const fs = require("fs");
const login = require("facebook-chat-api");
const readline = require("readline");
const argv = require("minimist")(process.argv.slice(2));

if (argv.login) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  login(
    { email: process.env.FB_EMAIL, password: process.env.FB_PASSWORD },
    (err, api) => {
      if (err) {
        switch (err.error) {
          case "login-approval":
            console.log("Enter 2FA code > ");
            rl.on("line", line => {
              err.continue(line);
              rl.close();
            });
            break;
          default:
            console.error(err);
        }
        return;
      }

      fs.writeFileSync("appstate.json", JSON.stringify(api.getAppState()));
    }
  );
} else {
  if (!fs.existsSync("appstate.json")) {
    console.error(
      "appstate.json doesn't exist! Re-run this script with the --login flag."
    );
    process.exit(0);
  }

  login(
    { appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) },
    (err, api) => {
      if (err) return console.error(err);
      console.log("Listening for messages...");

      api.listenMqtt((err, event) => {
        if (err) return console.error(err);
        //if (event.threadID !== process.env.CHAT_ID) return;

        if (event.type === "message" || event.type === "message_reply") {
          api.getUserInfo(event.senderID, (err, ret) => {
            if (err) return console.error(err);
            let msg = {
              type: event.type,
              sender: ret[event.senderID].name,
              body: event.body
            };

            if (event.messageReply) {
              msg.replyTo = event.messageReply.body;
            }
          });
        }
      });
    }
  );
}
