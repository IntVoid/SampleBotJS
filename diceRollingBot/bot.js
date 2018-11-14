const { ActivityTypes } = require('botbuilder');

const { ChoicePrompt, DialogSet, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');

const DIALOG_STATE_PROPERTY = 'dialogState';

const NEW_USER = 'new_user';
const DICE_ROLLING = 'dice_rolling';
const WHAT_TO_ROLL_PROMPT = 'what_to_roll';

var Regex = require("regex");

class MyBot {
  constructor(conversationState, userState) {
    // Create a new state accessor property.
    this.conversationState = conversationState;
    this.userState = userState;
    this.dialogState = this.conversationState.createProperty(DIALOG_STATE_PROPERTY);
    this.dialogs = new DialogSet(this.dialogState);

    // Add prompts that will be used by the main dialogs.
    this.dialogs.add(new TextPrompt(WHAT_TO_ROLL_PROMPT));

    // Create a dialog that asks the user for their name.
    this.dialogs.add(new WaterfallDialog(NEW_USER, [
      this.welcomeUser.bind(this)
    ]));
    
    this.dialogs.add(new WaterfallDialog(DICE_ROLLING, [
        this.promptForDiceToRoll.bind(this),
        this.displayResults.bind(this)
    ]));
}

async welcomeUser(step) {
  await step.context.sendActivity('To roll a dice, tell me how many you want roll and the number of sides. Ex: "1d20" or "Roll 6 dice of 10 sides". Say cancel to stop or help for assistance.');
  await step.beginDialog(DICE_ROLLING);
}

async promptForDiceToRoll(step) {
  return await step.prompt(WHAT_TO_ROLL_PROMPT);
}

async displayResults(step) {
  if(step.result && step.result.match(/\d+/g)) {
    var result = step.result.match(/\d+/g);
    if(result[0] > 1) {
      var allRolls = [];
      var rollTotal = 0;
      for (let index = 0; index < result[0]; index++) {
        var number = Math.floor(Math.random() * result[1]) + 1;
        allRolls.push(number);
        rollTotal += number;
      }
      await step.context.sendActivity(`You rolled ${allRolls} totalling ${rollTotal} on ${result[0]}d${result[1]}.`);
    } else {
      var number = Math.floor(Math.random() * result[1]) + 1;
      await step.context.sendActivity(`You rolled ${number} on ${result[0]}d${result[1]}.`);
    }
  }
    return await step.replaceDialog('dice_rolling');
}

async onTurn(turnContext) {
    if (turnContext.activity.type === ActivityTypes.Message) {
      const dc = await this.dialogs.createContext(turnContext);

      const utterance = (turnContext.activity.text || '').trim().toLowerCase();
      if (utterance === 'cancel') {
          if (dc.activeDialog) {
              await dc.cancelAllDialogs();
              await dc.context.sendActivity(`Ok... canceled.`);
          } else {
              await dc.context.sendActivity(`Nothing to cancel.`);
          }
      }
      if (utterance === 'help') {
        if (dc.activeDialog) {
            await dc.cancelAllDialogs();
            await dc.beginDialog(NEW_USER);
        } else {
            await dc.beginDialog(NEW_USER);
        }
      }

      // If the bot has not yet responded, continue processing the current dialog.
      await dc.continueDialog();

      // Start the sample dialog in response to any other input.
      if (!turnContext.responded) {
          await dc.beginDialog(NEW_USER);
      }
    } else if (
        turnContext.activity.type === ActivityTypes.ConversationUpdate
    ) {
        // Do we have any new members added to the conversation?
        if (turnContext.activity.membersAdded.length !== 0) {
            // Iterate over all new members added to the conversation
            for (var idx in turnContext.activity.membersAdded) {
                if (turnContext.activity.membersAdded[idx].id !== turnContext.activity.recipient.id) {
                    // Send a "this is what the bot does" message.
                    const description = [
                        'I am a bot that will roll dice for you!',
                        'Say anything to continue!'
                    ];
                    await turnContext.sendActivity(description.join(' '));
                }
            }
        }
    }

    // End this turn by saving changes to the conversation state.
    await this.conversationState.saveChanges(turnContext);
  }
}

module.exports.MyBot = MyBot;