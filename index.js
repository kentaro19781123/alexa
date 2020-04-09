// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const parser = require('xml2json');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');
const Axios = require('axios');
const myDocument = require('main.json');
const API_URL = 'https://xxxxx.co.jp/';
const API_KEY = 'xxxxxxxxxxxxxxxxxx';

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },

    async handle(handlerInput) {
        const respeakOutput = 'もう一度お願いします。何を注文しますか？';
        let speakOutput = `今日は何を注文しますか?`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(respeakOutput)
            .getResponse();
    }

};

// **** IntentHandler から名前を変更 ****
const OrderIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'PlaceIntent';
    },

    // 非同期処理のため async を追加する
    async handle(handlerInput) {
        // menu と amount スロットの値を取得
        var place = handlerInput.requestEnvelope.request.intent.slots.place;
        var category = handlerInput.requestEnvelope.request.intent.slots.category;
        let speakPlace;
        let speakPlaceText
        if (place.value === undefined) {
            place.value = "";
            speakPlace = "";
            speakPlaceText = "";
        } else {
            speakPlace = place.value;
            speakPlaceText = `${place.value}の`;
        }
        let speakCategory;
        let speakCategoryText
        if (category.value === undefined) {
            category.value = "";
            speakCategory = "";
            speakCategoryText = "";
        } else {
            speakCategory = `,${category.value}`;
            speakCategoryText = `${category.value}料理の`;
        }

        let speechText;
        if (place && place.value || category && category.value) {
            try {
                const res = await Axios.get(API_URL, {
                    params: {
                        keyid: API_KEY,
                        freeword: `${speakPlace},${speakCategory}`,
                        freeword_condition: "1"
                    }
                });
                if (res.data.error) {
                    speechText = "エラーです。";
                } else {
                    speechText = `${speakPlaceText}${speakCategoryText}お店は`;
                    res.data.rest.map( val => {
                        speechText += val.name;
                        speechText += "です。";
                        }
                    )
                }
                return handlerInput.responseBuilder
                    .speak(speechText)
                    .addDirective({
                        type: 'Alexa.Presentation.APL.RenderDocument',
                        token: '[SkillProvidedToken]',
                        version: '1.0',
                        document: myDocument,
                        datasources: {}
                    })
                    .getResponse();
            } catch (error) {
                return handlerInput.responseBuilder
                    .speak("APIのリクエストに失敗しました。スキルを中止します。")
                    .getResponse();
            }
        } else {
            throw new Error("条件を入れてね");
        }

    }
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        OrderIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    //   S3PersistentAdapter を PersistentAdapter に設定
    .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter(
                {bucketName:process.env.S3_PERSISTENCE_BUCKET}
            )
    )
    .lambda();
