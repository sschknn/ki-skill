// index.js
// Alexa Skill mit "Hey KI"-Intent und Gemini-Integration

const Alexa = require('ask-sdk-core');
const axios = require('axios');

// === Gemini API Konfiguration ===
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDcaXALm2sM1Qe1m1dAdqtb7E6Shy6aoG0'; // <-- Fester API-Key (bitte für Produktion als Umgebungsvariable setzen)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// === Launch Handler ===
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Willkommen! Sage "Hey KI" und stelle deine Frage.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Sage Hey KI, um mit Gemini zu sprechen.')
            .getResponse();
    }
};

// === HeyKIIntent Handler mit Gesprächsverlauf ===
const HeyKIIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'HeyKIIntent';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const userInput = Alexa.getSlotValue(handlerInput.requestEnvelope, 'frage') || 'Hallo Gemini!';
        // Gesprächsverlauf initialisieren
        if (!sessionAttributes.history) sessionAttributes.history = [];
        sessionAttributes.history.push({ role: 'user', text: userInput });
        let speakOutput = '';
        try {
            const geminiResponse = await callGeminiWithHistory(sessionAttributes.history);
            speakOutput = geminiResponse || 'Entschuldigung, ich habe keine Antwort erhalten.';
            sessionAttributes.history.push({ role: 'assistant', text: speakOutput });
        } catch (err) {
            speakOutput = 'Es gab ein Problem mit der KI-Antwort.';
        }
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Möchtest du noch etwas fragen?')
            .getResponse();
    }
};

// === Gemini API Call mit Gesprächsverlauf ===
async function callGeminiWithHistory(history) {
    try {
        // Baue die Konversation für Gemini
        const contents = history.map(entry => ({ text: entry.text }));
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [ { parts: contents } ]
            },
            { headers: { 'Content-Type': 'application/json' } }
        );
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text;
    } catch (error) {
        console.error('Gemini API Fehler:', error.message);
        return null;
    }
}

// === Gemini API Call ===
async function callGemini(userInput) {
    try {
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: userInput }] }]
            },
            { headers: { 'Content-Type': 'application/json' } }
        );
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text;
    } catch (error) {
        console.error('Gemini API Fehler:', error.message);
        return null;
    }
}

// === Help & Error Handler ===
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sage Hey KI, gefolgt von deiner Frage.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);
        return handlerInput.responseBuilder
            .speak('Entschuldigung, es gab ein Problem.')
            .getResponse();
    }
};

// === Skill Builder ===
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HeyKIIntentHandler,
        HelpIntentHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
