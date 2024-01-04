const { App, LogLevel } = require("@slack/bolt");
const axios = require("axios");

var userbc = "";
var channelbc = "";
const databaseURL =
  "https://trainfitnessdatabaseurlll-default-rtdb.firebaseio.com"; // Replace with your database URL

const channelID = process.env["bugchan"]; // Replace with your Slack channel ID

const app = new App({
  token: process.env["slacktoken"], // Replace with your Slack bot token
  signingSecret: process.env["slacksecret"],
});

// Event handler for member join events
/*app.event('team_join', async ({ event, client }) => {
  const adminApprovalChannelID = process.env["adminapp"]; // Replace with your actual channel ID
  const newMemberID = event.user.id;
  const newMemberName = `<@${newMemberID}>`;

  // Send a message to the admin-approval channel about the new member
  const adminApprovalMessage = await client.chat.postMessage({
    channel: adminApprovalChannelID,
    text: `New member joined: ${newMemberName}`,
    blocks: [
      {
        type: "section",
        block_id: "bug_details",
        text: {
          type: "mrkdwn",
          text: `*New member joined! Actions for ${newMemberName}*`,
        },
      },
      {
        type: 'actions',
        block_id: 'new_member_actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Add to bug-reports',
            },
            action_id: 'add_to_bug_reports',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Add to admin-buttons',
            },
            action_id: 'add_to_admin_buttons',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Add to invitations',
            },
            action_id: 'add_to_invitations',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Add to admin-approval',
            },
            action_id: 'add_to_admin_approval',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Ignore and delete message',
            },
            action_id: 'iganddel',
          },
        ],
      },
    ],
  });

  console.log('New member message sent:', adminApprovalMessage.ts);
});*/

app.action("iganddel", async ({ ack, body, client }) => {
  await ack();

  // Delete the original message
  await client.chat.delete({
    channel: body.channel.id,
    ts: body.message.ts,
  });
});

// Action handlers for the buttons
app.action("add_to_bug_reports", async ({ ack, body, client }) => {
  await ack();
  await addToChannel(body, client, process.env["bugchan"]);
});

app.action("add_to_admin_buttons", async ({ ack, body, client }) => {
  await ack();
  await addToChannel(body, client, process.env["adminchan"]);
});

app.action("add_to_invitations", async ({ ack, body, client }) => {
  await ack();
  await addToChannel(body, client, process.env["invit"]);
});

app.action("add_to_admin_approval", async ({ ack, body, client }) => {
  await ack();
  await addToChannel(body, client, process.env["adminapp"]);
});

// Function to add a user to a channel
async function addToChannel(body, client, channelID) {
  const userToAdd = body.message.text.match(/<@(.+?)>/)[1];
  await client.conversations.invite({
    channel: channelID,
    users: userToAdd,
  });
}

// Handle /report command or button click
app.command("/report", async ({ ack, body, client }) => {
  await ack();
  console.log("Report");

  // Open modal
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "report_modal",
      title: {
        type: "plain_text",
        text: "Report a Bug",
      },
      blocks: [
        {
          type: "input",
          block_id: "bug_title",
          element: {
            type: "plain_text_input",
            action_id: "bug_title_input",
            placeholder: {
              type: "plain_text",
              text: "Enter bug title",
            },
          },
          label: {
            type: "plain_text",
            text: "Bug Title",
          },
        },
        {
          type: "input",
          block_id: "bug_description",
          element: {
            type: "plain_text_input",
            multiline: true,
            action_id: "bug_description_input",
            placeholder: {
              type: "plain_text",
              text: "Enter bug description",
            },
          },
          label: {
            type: "plain_text",
            text: "Bug Description",
          },
        },
      ],
      submit: {
        type: "plain_text",
        text: "Submit",
      },
    },
  });
});

// Command handler for the /bugstatus command
app.command("/bugstatus", async ({ ack, body, client }) => {
  // Acknowledge the command
  await ack();

  const bugReportsChannelID = process.env["bugchan"]; // Replace with your actual bug-reports channel ID
  const currentChannelID = body.channel_id;

  // Check if the command is sent in the bug-reports channel
  if (currentChannelID !== bugReportsChannelID) {
    // Send a postephemeral message to the current channel
    await client.chat.postEphemeral({
      channel: currentChannelID,
      user: body.user_id,
      text: "This command can only be run in the bug-reports channel.",
    });
    return;
  }

  // Fetch all messages in the bug-reports channel
  const bugReports = await client.conversations.history({
    channel: bugReportsChannelID,
  });

  // Count the occurrences of different statuses
  let totalReports = 0;
  let reported = 0;
  let finishedReports = 0;
  let ignoredReports = 0;

  //console.log(bugReports.messages);

  bugReports.messages.forEach((message) => {
    try {
      //console.log(message.blocks[1].text.text.includes("*Status*: Reported"));
      if (message.blocks[1].text.text.includes("*Status*: Finished")) {
        finishedReports += 1;
        totalReports += 1;
      } else if (message.blocks[1].text.text.includes("*Status*: Ignored")) {
        ignoredReports += 1;
        totalReports += 1;
      } else if (message.blocks[1].text.text.includes("*Status*: Reported")) {
        reported += 1;
        totalReports += 1;
      }
    } catch {
      console.log("Failed");
    }
  });

  // Send a nicely formatted message with the bug status report
  await client.chat.postMessage({
    channel: bugReportsChannelID,
    text: "*Bug Status Report*",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Bug Status Report",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `>:page_facing_up: *Total Reports:* ${totalReports}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `>:speech_balloon: *Reported Reports:* ${reported}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `>:white_check_mark: *Finished Reports:* ${finishedReports}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `>:no_entry_sign: *Ignored Reports:* ${ignoredReports}`,
        },
      },
    ],
  });
});

// Handle modal submission
app.view("report_modal", async ({ ack, view, body, client }) => {
  await ack();
  // Extract bug details
  const bugTitle = view.state.values.bug_title.bug_title_input.value;
  const bugDescription =
    view.state.values.bug_description.bug_description_input.value;
  const reporter = body.user.id;

  // Generate unique case ID using Firebase Realtime Database
  const caseID = await generateUniqueCaseID();

  // Post bug details in the specified channel
  const bugMessage = await client.chat.postMessage({
    channel: channelID,
    text: `*New Bug Report*\n\n*Title:* ${bugTitle}\n*Description:* ${bugDescription}\n*Reporter:* <@${reporter}>\nCase ID: ${caseID}`,
    /*[
      {
        type: "section",
        block_id: "bug_details",
        text: {
          type: "mrkdwn",
          text: `*New Bug Report*\n\n*Title:* ${bugTitle}\n*Description:* ${bugDescription}\n*Reporter:* <@${reporter}>\nCase ID: ${caseID}`,
        },
      },
      {
        type: "actions",
        block_id: "bug_buttons",
        elements: [
          {
            type: "button",
            action_id: "finish_button",
            text: {
              type: "plain_text",
              text: "Finish",
            },
          },
          {
            type: "button",
            action_id: "ignore_button",
            text: {
              type: "plain_text",
              text: "Ignore",
            },
          },
        ],
      },
    ],*/
    blocks: [
      {
        type: "section",
        block_id: "bug_details",
        text: {
          type: "mrkdwn",
          text: `*New Bug Report*\n\n*Title:* ${bugTitle}\n*Description:* ${bugDescription}\n*Reporter:* <@${reporter}>\nCase ID: ${caseID}`,
        },
      },
      {
        type: "section",
        block_id: "bug_status",
        text: {
          type: "mrkdwn",
          text: "*Status*: Reported",
        },
      },
      {
        type: "actions",
        block_id: "bug_buttons",
        elements: [
          {
            type: "button",
            action_id: "finish_button",
            text: {
              type: "plain_text",
              text: "Finish",
            },
          },
          {
            type: "button",
            action_id: "ignore_button",
            text: {
              type: "plain_text",
              text: "Ignore",
            },
          },
        ],
      },
      {
        type: "divider",
      },
    ],
  });

  // Send DM to the reporter with bug details and case ID
  await client.chat.postMessage({
    channel: reporter,
    text: `>Thank you for reporting the bug with title: *${bugTitle}*! Your Case ID: ${caseID}. You can share images and other thoughts in the thread of this message. This will be your connection between admins and you!`,
  });

  // Store bug details in Firebase for future reference
  const details = {
    title: bugTitle,
    description: bugDescription,
    reporter: reporter,
    status: "reported",
  };

  await axios.put(`${databaseURL}/bugs/${caseID}.json`, details);
});

/*// Handle button clicks in the channel
app.action("finish_button", async ({ ack, body, client }) => {
  await ack();

  // Update bug status to 'finished'
  const caseID = extractCaseID(body.message.text);
  const updates = {
    status: "finished",
  };

  await axios.patch(`${databaseURL}/bugs/${caseID}.json`, updates);
});*/

/*app.action("ignore_button", async ({ ack, body, client }) => {
  await ack();

  // Update bug status to 'ignored'
  const caseID = extractCaseID(body.message.text);
  const updates = {
    status: "ignored",
  };

  await axios.patch(`${databaseURL}/bugs/${caseID}.json`, updates);
});*/

app.command("/broadcast", async ({ ack, body, client }) => {
  await ack();

  // Open a modal to gather broadcast message and conversation selection
  userbc = body.user_id;
  channelbc = body.channel_id;
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "broadcast_modal",
      title: {
        type: "plain_text",
        text: "Broadcast Message",
      },
      blocks: [
        {
          type: "input",
          block_id: "password_value",
          label: {
            type: "plain_text",
            text: "Broadcast Password",
          },
          element: {
            type: "plain_text_input",
            action_id: "message",
          },
        },
        {
          type: "input",
          block_id: "broadcast_message",
          label: {
            type: "plain_text",
            text: "Message",
          },
          element: {
            multiline: true,
            type: "plain_text_input",
            action_id: "message",
          },
        },
        {
          type: "input",
          block_id: "conversation_selection",
          label: {
            type: "plain_text",
            text: "Select Conversation",
          },
          element: {
            type: "conversations_select",
            action_id: "conversation",
          },
        },
      ],
      submit: {
        type: "plain_text",
        text: "Broadcast",
      },
    },
  });
});

// Command handler for /help_in_general
app.command("/general_help", async ({ ack, body, client, context }) => {
  await ack();

  // Open a modal to ask for a password
  try {
    const result = await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "password_modal",
        title: {
          type: "plain_text",
          text: "Enter Password",
        },
        blocks: [
          {
            type: "input",
            block_id: "password_input",
            label: {
              type: "plain_text",
              text: "Password",
            },
            element: {
              type: "plain_text_input",
              action_id: "password_input",
            },
          },
        ],
        submit: {
          type: "plain_text",
          text: "Submit",
        },
      },
    });
  } catch (error) {
    console.error(`Error opening modal: ${error.message}`);
  }
});

// Action handler for the password modal submission
app.view("password_modal", async ({ ack, body, view, client }) => {
  await ack();

  const enteredPassword = view.state.values.password_input.password_input.value;

  // Check if the entered password is correct
  if (enteredPassword === process.env["password"]) {
    const message = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Welcome to the Train Fitness Slack Workspace!* :train:",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "This is a place to share your experiences with the Train Fitness app and report any bugs in the beta versions. :bug:",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Reporting bugs is easily done by typing the `/report` command or pressing the button below. :speech_balloon:",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Whenever you have reported a bug, you will receive a message. When pictures are needed for clarity, please reply in the thread (hover over the message and click on the message icon on desktop or click on message on mobile) and upload your picture or video. :thread:",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "When sharing a picture, you will receive a message from slackbot that your message is shared in *bug-reports*, the private channel used to keep track of all your bugs! :clipboard:",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Have fun working out, and for any ideas, please don't hesitate to share them! :muscle:",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Having trouble with the Train Bot? Please contact <@${process.env["botman"]}>. :robot_face:\n*Train Bot likes sleep! If the buttons or commands don't work, please retry in 5-10 seconds and Train Bot will wake up!*`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Report a Bug",
              },
              action_id: "report_button",
            },
          ],
        },
      ],
    };

    try {
      await client.chat.postMessage({
        channel: process.env["genchan"],
        text: "Need help?",
        blocks: message.blocks,
      });
    } catch (error) {
      console.error(`Error sending help message: ${error.message}`);
    }
  } else {
    // Show an ephemeral message with an error
    try {
      await client.chat.postMessage({
        channel: body.user.id,
        user: body.user.id,
        text: "Incorrect password for help_in_general. Please try again.",
      });
    } catch (error) {
      console.error(`Error sending error message: ${error.message}`);
    }
  }
});

app.command("/accept_terms", async ({ ack, body, client, context }) => {
  await ack();

  // Open a modal to ask for a password
  try {
    const result = await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "password_modall",
        title: {
          type: "plain_text",
          text: "Enter Password",
        },
        blocks: [
          {
            type: "input",
            block_id: "password_input",
            label: {
              type: "plain_text",
              text: "Password",
            },
            element: {
              type: "plain_text_input",
              action_id: "password_input",
            },
          },
        ],
        submit: {
          type: "plain_text",
          text: "Submit",
        },
      },
    });
  } catch (error) {
    console.error(`Error opening modal: ${error.message}`);
  }
});

// Action handler for the password modal submission
app.view("password_modall", async ({ ack, body, view, client }) => {
  await ack();

  const enteredPassword = view.state.values.password_input.password_input.value;

  // Check if the entered password is correct
  if (enteredPassword === process.env["password"]) {
    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Welcome to the Train Fitness Group!:heart:",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Before we can start, here are some tips to get you started!\nIn this group we work with the Train Bot! The bot will help with broadcasting and reporting bugs.\n\nTo report a bug you can do either of the following: \n*- 1.* Use the `/report` command\n*- 2.* Use the button found in the general channel\n\nIn order to proceed in this workspace, we need you to be updated on how things work in this workspace. This will be explained below.",
          },
        },
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "How do we work?",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "We know how to report, but how do we fill the reports?\nWhen reporting a bug, you need to give a title and description. Make sure the title is short but descriptive, this way we know what the bug is about. When everything is filled in click submit. Don't worry we haven't forgotten about pictures because they are *VERY* important to us.\nAdding extra info to your bug report is easy!\n When you have submitted a bug report, you will receive a DM from Train Bot, in here you find your Case-ID which is used to identify your bug report. Adding extra info like an image, a video or how to recreate the bug, to the report is as easy as going into the thread (clicking on the message on mobile and hovering then clicking the message icon on desktop) and sending it there.The thread is your connection between your report, the admins, and you! \nOnce a report of yours is handled, you will receive an update about the report and you will be able to clear (most of) the Train Bot DM messages.",
          },
        },
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Boys just wanna have fun!",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "This workspace is a place for good vibes and good vibes only, anyone that does not bring good vibes, will receive bad vibes! Nah just kidding, just make sure we keep it all clean and friendly in here, *hate in any form is not accepted here!*",
          },
        },
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Privacy :hand:",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "When submitting a bug report your name will be registered to the report.\nWhen submiting an image, the image will be shared in a private channel *bug-reports* to add it to your bug report. You will always receive a slackbot message when your files are forwarded.",
          },
        },
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Consent :+1:",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "By clicking the button below, you swear to have read the integrity of this message. You also acknowledge the use of your information: name and files, to be shared to the private channel *bug reports*.\n*Train Bot likes sleep! If the buttons or commands don't work, please retry in 5-10 seconds and Train Bot will wake up!*",
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "I have read the full message",
                emoji: true,
              },
              action_id: "letinworkspace",
            },
          ],
        },
      ],
    };

    try {
      await client.chat.postMessage({
        channel: process.env["accchan"],
        text: "Please accept our terms!",
        blocks: message.blocks,
      });
    } catch (error) {
      console.error(`Error sending help message: ${error.message}`);
    }
  } else {
    // Show an ephemeral message with an error
    try {
      await client.chat.postMessage({
        channel: body.user.id,
        user: body.user.id,
        text: "Incorrect password for help_in_general. Please try again.",
      });
    } catch (error) {
      console.error(`Error sending error message: ${error.message}`);
    }
  }
});

app.action("letinworkspace", async ({ body, ack, client }) => {
  await ack();
  const useracc = body.user.id;

  const response = await app.client.conversations.members({
    channel: process.env["genchan"],
  });
  if (response.members.includes(useracc)) {
    client.chat.postEphemeral({
      channel: process.env["accchan"],
      user: body.user.id,
      text: "You are already in the workspace!",
    });
  } else {
    await client.conversations.invite({
      channel: process.env["genchan"],
      users: body.user.id,
    });
    await client.conversations.invite({
      channel: process.env["appsug"],
      users: body.user.id,
    });
    await client.conversations.invite({
      channel: process.env["slacksug"],
      users: body.user.id,
    });

    const adminApprovalChannelID = process.env["adminapp"]; // Replace with your actual channel ID
    const newMemberID = body.user.id;
    const newMemberName = `<@${newMemberID}>`;

    // Send a message to the admin-approval channel about the new member
    const adminApprovalMessage = await client.chat.postMessage({
      channel: adminApprovalChannelID,
      text: `New member joined: ${newMemberName}`,
      blocks: [
        {
          type: "section",
          block_id: "bug_details",
          text: {
            type: "mrkdwn",
            text: `*New member joined! Actions for ${newMemberName}*`,
          },
        },
        {
          type: "actions",
          block_id: "new_member_actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Add to bug-reports",
              },
              action_id: "add_to_bug_reports",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Add to admin-buttons",
              },
              action_id: "add_to_admin_buttons",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Add to invitations",
              },
              action_id: "add_to_invitations",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Add to admin-approval",
              },
              action_id: "add_to_admin_approval",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Ignore and delete message",
              },
              action_id: "iganddel",
            },
          ],
        },
      ],
    });
  }
});

app.view("broadcast_modal", async ({ ack, body, view, client }) => {
  await ack();

  const password = view.state.values.password_value.message.value;
  const broadcastMessageField = view.state.values.broadcast_message;
  const conversationSelectionField = view.state.values.conversation_selection;
  if (password == process.env["password"]) {
    if (broadcastMessageField && conversationSelectionField) {
      const message = broadcastMessageField.message.value.replace(
        /[\r\n]+/g,
        "*\n*",
      );
      const selectedConversation =
        conversationSelectionField.conversation.selected_conversation;

      // Post the broadcast message in the selected conversation
      await client.chat.postMessage({
        channel: selectedConversation,
        text: `*${message}*`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${message.toString()}*`,
            },
          },
        ],
      });
    } else {
      console.error(
        "Broadcast message or conversation selection field is missing.",
      );
    }
  } else {
    await client.chat.postEphemeral({
      channel: channelbc,
      text: "Incorrect password for broadcast. Please try again.",
      user: userbc,
    });
    userbc = "";
    channelbc = "";
  }
});

app.action("broadcast_button", async ({ ack, body, client }) => {
  await ack();

  // Open a modal to gather broadcast message and conversation selection
  userbc = body.user_id;
  channelbc = body.channel_id;
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "broadcast_modal",
      title: {
        type: "plain_text",
        text: "Broadcast Message",
      },
      blocks: [
        {
          type: "input",
          block_id: "password_value",
          label: {
            type: "plain_text",
            text: "Broadcast Password",
          },
          element: {
            type: "plain_text_input",
            action_id: "message",
          },
        },
        {
          type: "input",
          block_id: "broadcast_message",
          label: {
            type: "plain_text",
            text: "Message",
          },
          element: {
            multiline: true,
            type: "plain_text_input",
            action_id: "message",
          },
        },
        {
          type: "input",
          block_id: "conversation_selection",
          label: {
            type: "plain_text",
            text: "Select Conversation",
          },
          element: {
            type: "conversations_select",
            action_id: "conversation",
          },
        },
      ],
      submit: {
        type: "plain_text",
        text: "Broadcast",
      },
    },
  });
});

app.action("finish_button", async ({ body, ack, client }) => {
  await ack();

  const caseID = extractCaseID(body.message.text);

  if (caseID) {
    // Update the bug status in the database
    await updateBugStatus(caseID, "finished");

    // Fetch the existing blocks in the message
    const existingBlocks = body.message.blocks;

    // Find the index of the 'Status' section block
    const statusBlockIndex = existingBlocks.findIndex(
      (block) => block.block_id === "bug_status",
    );

    if (statusBlockIndex !== -1) {
      // Update the 'Status' section block
      existingBlocks[statusBlockIndex] = {
        type: "section",
        block_id: "bug_status",
        text: {
          type: "mrkdwn",
          text: "*Status*: Finished :white_check_mark:",
        },
      };

      existingBlocks.push({
        type: "actions",
        block_id: "delete_button",
        elements: [
          {
            type: "button",
            action_id: "delete_button",
            text: {
              type: "plain_text",
              text: "Delete report",
            },
          },
        ],
      });

      // Edit the bug message in the channel
      await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        blocks: existingBlocks,
      });
    }

    const reporterUserID = extractReporterUserID(body.message.text);
    if (reporterUserID) {
      // Delete the original bug report message in the reporter's DM
      //await deleteMessageInDM(reporterUserID, caseID, client);

      // Send a new message to the reporter in DM
      await client.chat.postMessage({
        channel: reporterUserID,
        text: `Your bug report with Case ID: ${caseID} has been finished! :white_check_mark:`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Case ID*: ${caseID}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Status change: Reported -> Finished* :white_check_mark:`,
            },
          },
          {
            type: "actions",
            block_id: "delete_button",
            elements: [
              {
                type: "button",
                action_id: "delete_dm",
                text: {
                  type: "plain_text",
                  text: "Delete DM's",
                },
              },
            ],
          },
        ],
      });
    }
  }
});

/*async function deleteDMMessages(channel, ts, client) {
  try {
    // Fetch messages in the DM
    const messages = await client.conversations.history({
      channel: channel,
      latest: ts,
      limit: 1000,
    });

    // Delete all messages in the DM
    if (messages.messages && messages.messages.length > 0) {
      for (const message of messages.messages) {
        await client.chat.delete({
          channel: channel,
          ts: message.ts,
        });

        // Recursively delete sub-messages
        await deleteDMMessages(channel, message.ts, client);
      }
    }
    await client.chat.delete({
      channel: channel,
      ts: ts,
    });

  } catch (error) {
    console.error(`Error deleting DM messages: ${error.message}`);
  }
}*/

async function deleteDMMessages(channel, ts, client) {
  try {
    // Fetch messages in the DM
    const messages = await client.conversations.history({
      channel: channel,
      latest: ts,
      limit: 1000,
    });

    console.log(messages);

    // Delete all messages in the DM
    if (messages.messages && messages.messages.length > 0) {
      for (const message of messages.messages) {
        //await deleteDMMessages(channel, message.ts, client);
        try {
          await client.chat.delete({
            channel: channel,
            ts: message.ts,
          });
        } catch (deleteError) {
          if(message.subtype === 'tombstone'){
            await deleteDMMessages(channel, message.ts, client);
          }
          console.error(`Error deleting message: ${deleteError.message}`);
          // Continue to the next message if deletion fails
          continue;
        }

        // Recursively delete sub-messages
        //await deleteDMMessages(channel, message.ts, client);
      }
    }

    // Delete the original message
    try {
      await client.chat.delete({
        channel: channel,
        ts: ts,
      });
    } catch (deleteError) {
      console.error(`Error deleting original message: ${deleteError.message}`);
    }
  } catch (error) {
    console.error(`Error fetching DM messages: ${error.message}`);
  }
}


// Action handler for the button click in DM
app.action("delete_dm", async ({ ack, body, client }) => {
  await ack();

  // Call the recursive function to delete messages and their replies in the DM
  //await deleteDMMessages(body.channel.id, body.message.ts, client);
  try {
    // Get the user ID of the user who sent the command
    const userId = body.user_id;
    console.log(body.container.channel_id);
    const dmChannel = body.container.channel_id;;

    if (dmChannel) {
      // Get all messages in the DM channel
      const messages = await app.client.conversations.history({
        channel: dmChannel,
      });

      // Delete each message in the DM channel
      for (const message of messages.messages) {
        await app.client.chat.delete({
          channel: dmChannel,
          ts: message.ts,
        });
      }

      // Confirm the deletion
    } else {
      console.log("no channel found");
    }
  } catch (error) {
    console.error('Error:', error);
  }
});

app.action("report_button", async ({ body, ack, client }) => {
  await ack();
  console.log("Report");

  // Open modal
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "report_modal",
      title: {
        type: "plain_text",
        text: "Report a Bug",
      },
      blocks: [
        {
          type: "input",
          block_id: "bug_title",
          element: {
            type: "plain_text_input",
            action_id: "bug_title_input",
            placeholder: {
              type: "plain_text",
              text: "Enter bug title",
            },
          },
          label: {
            type: "plain_text",
            text: "Bug Title",
          },
        },
        {
          type: "input",
          block_id: "bug_description",
          element: {
            type: "plain_text_input",
            multiline: true,
            action_id: "bug_description_input",
            placeholder: {
              type: "plain_text",
              text: "Enter bug description",
            },
          },
          label: {
            type: "plain_text",
            text: "Bug Description",
          },
        },
      ],
      submit: {
        type: "plain_text",
        text: "Submit",
      },
    },
  });
});

app.action("ignore_button", async ({ body, ack, client }) => {
  await ack();

  const caseID = extractCaseID(body.message.text);

  if (caseID) {
    // Update the bug status in the database
    await updateBugStatus(caseID, "ignored");

    // Fetch the existing blocks in the message
    const existingBlocks = body.message.blocks;

    // Find the index of the 'Status' section block
    const statusBlockIndex = existingBlocks.findIndex(
      (block) => block.block_id === "bug_status",
    );

    if (statusBlockIndex !== -1) {
      // Update the 'Status' section block
      existingBlocks[statusBlockIndex] = {
        type: "section",
        block_id: "bug_status",
        text: {
          type: "mrkdwn",
          text: "*Status*: Ignored :no_entry_sign:",
        },
      };

      existingBlocks.push({
        type: "actions",
        block_id: "delete_button",
        elements: [
          {
            type: "button",
            action_id: "delete_button",
            text: {
              type: "plain_text",
              text: "Delete report",
            },
          },
        ],
      });

      // Edit the bug message in the channel
      await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        blocks: existingBlocks,
      });
    }

    const reporterUserID = extractReporterUserID(body.message.text);
    if (reporterUserID) {
      // Delete the original bug report message in the reporter's DM
      //await deleteMessageInDM(reporterUserID, caseID, client);

      // Send a new message to the reporter in DM
      await client.chat.postMessage({
        channel: reporterUserID,
        text: `Your bug report with Case ID: ${caseID} has been ignored! :no_entry_sign:`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Case ID*: ${caseID}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Status change: Reported -> Ignored* :no_entry_sign:`,
            },
          },
          {
            type: "actions",
            block_id: "delete_button",
            elements: [
              {
                type: "button",
                action_id: "delete_dm",
                text: {
                  type: "plain_text",
                  text: "Delete DM's",
                },
              },
            ],
          },
        ],
      });
    }
  }
});

app.action("delete_button", async ({ body, ack, client }) => {
  await ack();

  const caseID = extractCaseID(body.message.text);

  if (caseID) {
    // Call a function to delete the message and all messages under the thread
    await deleteMessageAndThread(body.channel.id, body.message.ts, client);
  }
});

// Function to delete the message and all messages under the thread
async function deleteMessageAndThread(channel, ts, client) {
  try {
    // Fetch replies in the thread
    const replies = await client.conversations.replies({
      channel: channel,
      ts: ts,
    });

    if (replies.messages && replies.messages.length > 0) {
      for (const reply of replies.messages) {
        await client.chat.delete({
          channel: channel,
          ts: reply.ts,
        });

        // Recursively delete sub-replies
        await deleteMessageAndThread(channel, reply.ts, client);
      }
    }

    // Delete the original message
    await client.chat.delete({
      channel: channel,
      ts: ts,
    });
  } catch (error) {
    console.error(`Error deleting message and thread: ${error.message}`);
  }
}

// Function to extract the reporter's user ID from the bug message
function extractReporterUserID(messageText) {
  const match = messageText.match(/<@([^>]*)>/);
  return match ? match[1] : null;
}

// Function to delete a message in the reporter's DM with the given Case ID
async function deleteMessageInDM(reporterUserID, caseID, client) {
  const dmHistory = await client.conversations.history({
    channel: reporterUserID,
    limit: 10, // Adjust the limit as needed
  });
  console.log("History checked!");

  const matchingMessage = dmHistory.messages.find(
    (message) => extractCaseID(message.text) === caseID,
  );

  if (matchingMessage) {
    await client.chat.delete({
      channel: reporterUserID,
      ts: matchingMessage.ts,
    });
  }
}

async function updateBugStatus(caseID, status) {
  if (status === "finished" || status === "ignored") {
    // Delete the bug entry from the database
    await axios.delete(`${databaseURL}/bugs/${caseID}.json`);
  } else {
    // Update the bug status in the database
    await axios.patch(`${databaseURL}/bugs/${caseID}.json`, { status });
  }
}

// Listen for messages in DMs for handling thread images
/*app.message(async ({ event, client }) => {
  if (event.thread_ts && event.files && event.files.length > 0) {
    // Fetch the top-level message in the thread
    const threadInfo = await client.conversations.replies({
      channel: event.channel,
      ts: event.thread_ts,
    });

    // Ensure there are replies in the thread
    if (threadInfo.messages && threadInfo.messages.length > 0) {
      const caseID = extractCaseID(threadInfo.messages[0].text);

      if (caseID) {
        // Find the bug in the channel and add the image to the thread
        const response = await axios.get(`${databaseURL}/bugs/${caseID}.json`);
        if (response.data !== null) {
          const channelMessage = await client.chat.postMessage({
            channel: channelID,
            thread_ts: event.thread_ts,
            text: `Image for Bug ID: ${caseID}`,
            files: event.files,
          });
        }
      }
    }
  }
});*/

/*app.message(async ({ event, client }) => {
  if (event.thread_ts && event.files && event.files.length > 0) {
    // Fetch the top-level message in the thread
    const threadInfo = await client.conversations.replies({
      channel: event.channel,
      ts: event.thread_ts,
    });

    // Ensure there are replies in the thread
    const caseID = extractCaseID(threadInfo.messages[0].text);

    if (caseID) {
      const searchResults = await client.search.messages({
        channel: process.env["bugchan"], // Replace with your channel ID
        query: `Case ID: ${caseID}`,
      });
      if (
        searchResults.messages &&
        searchResults.messages.matches &&
        searchResults.messages.matches.length > 0
      ) {
        const channelMessage = await client.chat.postMessage({
          channel: process.env["bugchan"], // Replace with your channel ID
          thread_ts: searchResults.messages.matches[0].ts, // Use the timestamp of the found message
          text: `Image for Bug ID: <${event.files[0].permalink}|${caseID}>`,
        });
        // Find the bug in the channel and add the image to the thread
      }
    }
  }
});*/

// Function to handle messages in the specified channel
async function handleMessage(message, client) {
  const { text, subtype, user, ts, thread_ts, channel } = message;
  var rectextmes = text;
  console.log(text);

  // Check if the message is not from the "Train Bot" and is in a thread
  if (user !== "Train Bot" && thread_ts) {
    // Extract original message details
    const originalMessage = await app.client.conversations.replies({
      channel: message.channel,
      ts: thread_ts,
    });
    console.log("Test1");
    const originalText = originalMessage.messages[0].text;
    const caseID = extractCaseID(originalText);
    const reporterUserID = extractReporterUserID(originalText);

    console.log(caseID + ": " + reporterUserID);
    if (caseID && reporterUserID) {
      // Save the text of the last received and activated message
      rectextmes = text;

      // Find the DM with the reporter's user ID
      const dmChannel = await client.conversations.open({
        users: reporterUserID,
      });

      // Search for the message containing the case ID in the DM thread
      /*const dmThread = await app.client.conversations.replies({
        channel: dmChannel.channel.id,
        ts: thread_ts,
      });*/

      const history = await client.conversations.history({
        channel: dmChannel.channel.id,
      });

      console.log(history);

      const matchingMessage = await history.messages.find(
        (message) =>
          message.text && message.text.includes(`Case ID: ${caseID}`),
      );
      console.log("Matchingmessages: " + matchingMessage);

      if (matchingMessage) {
        console.log("Test3");
        const channelMessage = await client.chat.postMessage({
          channel: reporterUserID, // Replace with your channel ID
          thread_ts: matchingMessage.ts, // Use the timestamp of the found message
          text: `Message from admins: *${text}*`,
        });

        await client.reactions.add({
          channel: channel,
          name: "white_check_mark",
          timestamp: ts,
        });
      }

      /*// Post the saved text with the prefix to the DM thread
      await app.client.chat.postMessage({
        channel: dmChannel.channel.id,
        text: `Message from admins: ${text}`,
        thread_ts: dmThread.messages[0].ts,
      });*/
    }
  }
}

app.message(async ({ event, client }) => {
  /*await client.chat.postMessage({
    channel: process.env["adminchan"],
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Hello everyone! 👋*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "Here's an explanation of how everything works with the Train Bot:\n\n" +
            "When someone reports a bug, they are prompted with a modal where they need to give a title and explanation. " +
            "When they submit the modal, two things happen:\n" +
            "1. The bug report is sent in the bug-report channel.\n" +
            "2. The user that reported gets a message in DM as a thank you. They can also share images from here by going into the thread of the report and sharing their pics or vids.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "When a report is finalized or ignored, use the buttons underneath the report to close them. Once a button is pressed, " +
            "you are not able to change the status. When finalise or ignore is clicked, the user that reported the bug will receive a DM regarding the status change. \n" +
            "They will be able to clear their DM with the bot to keep everything organized; this may take a minute.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "The reports all get a unique case ID, which is stored in a database to ensure that no duplicate case-IDs are given. " +
            "This ID connects the DM to the bug-reports channel.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "When a person shares a picture or video in the DM for a bug, Slackbot will send a message saying that the picture or video is shared. \n" +
            "This is for security reasons and cannot be turned off.",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "There is one more thing that the Train Bot can do, which is broadcasting. \n" +
            "You are able to broadcast a message to a specific channel by using the /broadcast command or the button below this message. For this, along with the /help_in_general command, you will need the a password!",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `If you have any problems regarding the bot or you have any suggestions, please contact <@U04AV67U81M>.`,
        },
      },
      {
        type: "actions",
        block_id: "broadcast",
        elements: [
          {
            type: "button",
            action_id: "broadcast_button",
            text: {
              type: "plain_text",
              text: "Broadcast",
            },
          },
        ],
      },
    ],
  });*/
  console.log(event.channel);
  if (event.channel === process.env["bugchan"]) {
    // Handle the message
    console.log("bugchan message");
    await handleMessage(event, client);
  } else {
    console.log("DM");
    if (event.thread_ts) {
      console.log("Message in Thread DM");
      const threadInfo = await client.conversations.replies({
        channel: event.channel,
        ts: event.thread_ts,
      });

      const caseID = extractCaseID(threadInfo.messages[0].text);

      if (caseID) {
        // Fetch messages from the channel
        const history = await client.conversations.history({
          channel: process.env["bugchan"], // Replace with your channel ID
          inclusive: true,
          latest: event.thread_ts,
          limit: 10000, // Adjust the limit as needed
        });

        // Search for the message with the correct Case ID
        const matchingMessage = history.messages.find(
          (message) =>
            message.text && message.text.includes(`Case ID: ${caseID}`),
        );
        console.log(event.text);

        // Check if a matching message was found
        if (matchingMessage) {
          if (event.files && event.files.length > 0) {
            const channelMessage = await client.chat.postMessage({
              channel: process.env["bugchan"], // Replace with your channel ID
              thread_ts: matchingMessage.ts, // Use the timestamp of the found message
              text: `Image for Bug ID: <${event.files[0].permalink}|${caseID}>`,
            });

            await client.reactions.add({
              channel: event.channel,
              name: "white_check_mark",
              timestamp: event.ts,
            });
          } else {
            const channelMessage = await client.chat.postMessage({
              channel: process.env["bugchan"], // Replace with your channel ID
              thread_ts: matchingMessage.ts, // Use the timestamp of the found message
              text: `Message from reporter: *${event.text}*`,
            });

            await client.reactions.add({
              channel: event.channel,
              name: "white_check_mark",
              timestamp: event.ts,
            });
          }
        }
      }
    }
  }
});

// Function to generate a unique case ID
async function generateUniqueCaseID() {
  let caseID;
  let response;

  do {
    caseID = generateRandomID();
    response = await axios.get(`${databaseURL}/bugs/${caseID}.json`);
  } while (response.data !== null);

  return caseID;
}

// Function to extract case ID from a message
function extractCaseID(message) {
  const match = message.match(/Case ID: (\w+)/);
  return match ? match[1] : null;
}

// Function to generate a random ID
function generateRandomID() {
  return Math.random().toString(36).substring(2, 18);
}

// Start the app
(async () => {
  await app.start(process.env.PORT || 3000);

  console.log("Train Bot is running!");
})();

