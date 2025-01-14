console.log("Content loaded")
let autoplay = false;
const autoPlayButtonId = "MusescoreInputHelper_AutoPlayButton";
const calibrateButtonId = "MusescoreInputHelper_CalibrateButton";
const buttonClass = "MusescoreInputHelper_Button";
const keyboardWrapperClass = "js-pianoKeyboardWrapper";
const toggleKeyboardWrapperId = "piano-keyboard-button";
const calibratedKeysStorageKey = "calibratedKeys";
let playButton;
let isPickingPlayButton = false;
let autoplayObserver;
let isCalibrating = false;

let activeKeyboardHighlightedKeys = [];
let activeMidiKeys = [];

// Ids of keyboard keys
let calibratingKeys = []
// midi_key, keyboard_key
let calibratedKeys = [];

let isPlaying = false;

// Storage

function saveData(key, data) {
    let obj = {};
    obj[key] = data;
    chrome.storage.local.set(obj, function() {
        console.log('Data saved:', key, data);
    });
}

function loadData(key, callback) {
    chrome.storage.local.get([key], function(result) {
        console.log('Data loaded:', key, result[key]);
        callback(result[key]);
    });
}

// Controls

function addControlsToPage() {
    let controlsDiv = document.getElementById('playerControlsSection');
    if (!controlsDiv)
        return;

    // Autoplay button

    let button = document.createElement('button');
    button.innerText = 'Autoplay';
    button.id = autoPlayButtonId;
    button.classList.add(buttonClass);
    button.addEventListener('click', () => {
        this.toggleAutoplay();
    });
    controlsDiv.appendChild(button);

    let toggleKeyboardWrapper = document.getElementById(toggleKeyboardWrapperId);
    toggleKeyboardWrapper.addEventListener('click', () => {
        setTimeout(() => {
            if (!document.getElementsByClassName(keyboardWrapperClass)?.[0] && autoplay) {
                this.toggleAutoplay();
            }
        }, 150);
    });

    let calibrateButton = document.createElement('button');
    calibrateButton.innerText = 'Calibrate';
    calibrateButton.id = calibrateButtonId;
    calibrateButton.classList.add(buttonClass);
    calibrateButton.addEventListener('click', () => {
        this.initCalibration();
    });
    controlsDiv.appendChild(calibrateButton);


    // "Pick play button" button - Not needed for now
    // let pickButton = document.createElement('button');
    // pickButton.innerText = 'Pick play button';
    // pickButton.classList.add(buttonClass);
    // pickButton.addEventListener('click', () => {
    //     startPickingPlayButton();
    // });
    // controlsDiv.appendChild(pickButton);

}

// Pick play button

function pickPlayButton(button) {
    document.removeEventListener('mouseover', setHoverStyle);
    document.removeEventListener('mouseout', removeHoverStyle);
    document.removeEventListener('mousedown', setPlayButton);
    playButton = button;
    isPickingPlayButton = false;
}

function startPickingPlayButton() {
    console.log("start picking");
    document.addEventListener('mouseover', setHoverStyle);
    document.addEventListener('mouseout', removeHoverStyle);
    document.addEventListener('mousedown', setPlayButton);
    isPickingPlayButton = true;
}

function setHoverStyle(event) {
    console.log('hovering');
    let target = event.target;
    let button = target.closest('button');
    if (button)
        button.style.border = '2px solid red';

}
function removeHoverStyle(event) {
    let target = event.target;
    let button = target.closest('button');
    if (button)
        button.style.border = 'none';

}
function setPlayButton(event) {
    if (!isPickingPlayButton)
        return;
    let target = event.target;
    let button = target.closest('button');
    if (!button)
        return;
    this.removeHoverStyle(event);
    this.pickPlayButton(button);
}

// Autoplay
function toggleAutoplay() {
    autoplay = !autoplay;
    let button = document.getElementById(autoPlayButtonId);
    button.classList.toggle('active');
    if (autoplay) {
        const keyboardWrapper = document.getElementsByClassName(keyboardWrapperClass)?.[0];
        if (!keyboardWrapper) {
            document.getElementById(toggleKeyboardWrapperId).click();
            return;
        } else {
            this.observeKeyboardChanges();
        }
    }
    else
        autoplayObserver.disconnect();
}

// Global styles

function addStyleToPage() {
    let style = document.createElement('style');
    style.innerHTML = `
        .${buttonClass} {
            background: none;
            border: none;
            cursor: pointer;
            position: relative;
            height: 100%;
            padding: .5rem;
            min-width: 75px;

            &.active, &.calibrating {
                font-weight: 700;
                &::before {
                    content: "";
                    height: 100%;
                    left: 50%;
                    position: absolute;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    transition: all .2s cubic-bezier(.4,0,.2,1);
                    transition-property: background, color, box-shadow;
                    width: 100%;
                    background:var(--mu-color-action-secondary-hovered);
                    border-radius: 15px;
                }
            }

            &.calibrating {
                cursor: not-allowed;
                color: green;
                &::before {
                    background: var(--mu-color-action-secondary-hovered);
                }
            }
        }
        .wrong_input {
            fill: #ef0000;
        }
        .correct_input {
            fill: #00ef00;
        }
    `;
    document.head.appendChild(style);
}





// Calibration

function initCalibration() {
    const keyboardWrapper = document.getElementsByClassName(keyboardWrapperClass)?.[0];
    if (!keyboardWrapper) {
        document.getElementById(toggleKeyboardWrapperId).click();
        setTimeout(initCalibration, 100);
        return;
    }
    isCalibrating = true;
    calibratedKeys = [];
    let calibrateButton = document.getElementById(calibrateButtonId);
    calibrateButton.classList.add('calibrating');
    calibrateButton.innerText = 'Calibrating...';

    const keys = keyboardWrapper.getElementsByTagName('path');
    calibratingKeys = activeKeyboardHighlightedKeys = Array.from(keys).map(key => key.id);

    this.showNextCalibrationKey();
    

}

function finishCalibration() {
    let calibrateButton = document.getElementById(calibrateButtonId);
    calibrateButton.classList.remove('calibrating');
    calibrateButton.innerText = 'Calibrate';
    saveData(calibratedKeysStorageKey, calibratedKeys);
    isCalibrating = false;
    console.log("Calibration finished", calibratedKeys);
}

function setCalibratedMidiKey(midiKey) {
    let currentKey = calibratingKeys.shift();
    let key = document.getElementById(currentKey);
    key.classList.remove('correct_input');

    let pair = {
        midiKey: midiKey,
        keyboardKey: currentKey
    }
    calibratedKeys.push(pair);
    if (calibratingKeys.length === 0) {
        this.finishCalibration();
        return;
    }
    this.showNextCalibrationKey();
}

function showNextCalibrationKey() {
    let nextKey = calibratingKeys[0];
    let key = document.getElementById(nextKey);
    key.classList.add('correct_input');
}


// Midi input validation handling
function validateCurrentMidiInput() {
    const keyboardWrapper = document.getElementsByClassName(keyboardWrapperClass)?.[0];
    if (!keyboardWrapper) {
        console.error('Keyboard wrapper not found');
        return;
    }
    Array.from(keyboardWrapper.getElementsByTagName('path')).forEach(key => {
        if (key.classList.contains('wrong_input'))
            key.classList.remove('wrong_input');
        if (key.classList.contains('correct_input'))
            key.classList.remove('correct_input');
    });

    let wrongInputs = activeKeyboardHighlightedKeys.length;
    activeMidiKeys.forEach(key => {
        let calibratedKey = calibratedKeys.find(calibratedKey => calibratedKey.midiKey === key);
        if (!calibratedKey) {
            console.error('Key not calibrated', key);
            return;
        }
        let keyboardKey = calibratedKey.keyboardKey;
        let keyElement = keyboardWrapper.querySelector(`#${keyboardKey}`);
        if (!keyElement) {
            console.error('Key not found', keyboardKey);
            return;
        }
        
        if (activeKeyboardHighlightedKeys.includes(keyboardKey)) {
            if (!keyElement.classList.contains('correct_input')) {
                keyElement.classList.add('correct_input');
                wrongInputs--;
            }
        } else {
            if (!keyElement.classList.contains('wrong_input')) {
                keyElement.classList.add('wrong_input');
                wrongInputs++;
            }
        }

    });

    // Return if not autoplaying, but keep displaying the wrong inputs
    if (!autoplay) {
        return;
    }

    if (
        (wrongInputs === 0 && !isPlaying) ||
        (wrongInputs > 0 && isPlaying) ||
        (activeKeyboardHighlightedKeys.length == 0 && !isPlaying)
    ) {
        playButton.click();
    }
}


// Keyboard Preview Handling
function setKeyboardHighlightedKeys() {
    const keyboardWrapper = document.getElementsByClassName(keyboardWrapperClass)?.[0];
    if (!keyboardWrapper) {
        console.error('Keyboard wrapper not found');
        return;
    }

    const keys = keyboardWrapper.getElementsByTagName('path');
    let oldKeys = [...activeKeyboardHighlightedKeys];
    activeKeyboardHighlightedKeys = Array.from(keys).filter(key => key.attributes.fill?.value !== '#fff' && key.attributes.fill).map(key => key.id);
    if (oldKeys.length === activeKeyboardHighlightedKeys.length && oldKeys.every((value, index) => value === activeKeyboardHighlightedKeys[index])) {
        return;
    }
    validateCurrentMidiInput();
}

function observeKeyboardChanges() {

    const keyboardWrapper = document.getElementsByClassName(keyboardWrapperClass)?.[0];
    if (!keyboardWrapper) {
        return;
    }

    autoplayObserver = new MutationObserver(function(mutations) {
        setKeyboardHighlightedKeys();
    });

    const config = { childList: true, subtree: true, attributes: true };
    autoplayObserver.observe(keyboardWrapper, config);
}


// MIDI Input Handling
function initializeMIDI() {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    } else {
        console.error("Web MIDI API is not supported in this browser.");
    }
}

function onMIDISuccess(midiAccess) {
    console.log("MIDI Access obtained.");
    for (let input of midiAccess.inputs.values()) {
        input.onmidimessage = this.handleMIDIMessage;
    }
}

function onMIDIFailure() {
    console.error("Failed to get MIDI access.");
}

function handleMIDIMessage(message) {
    const [command, note, velocity] = message.data;

    if (isCalibrating) {
        if (command === 144)
            setCalibratedMidiKey(note);
        return;
    }

    if (command === 144 && !activeMidiKeys.includes(note)) {
        activeMidiKeys.push(note);
    } else if (command === 128) {
        activeMidiKeys = activeMidiKeys.filter(key => key !== note);
    }

    validateCurrentMidiInput();
}


// Initializer
let lookForDivInterval = setInterval(() => {
    let controlsDiv = document.getElementById('playerControlsSection');
    console.log('Looking for controlsdiv', controlsDiv);
    if (controlsDiv) {
        clearInterval(lookForDivInterval);
        loadData(calibratedKeysStorageKey, (data) => {
            if (data) {
                calibratedKeys = data;
                if (calibratedKeys.length > 0) {
                    calibrateButton = document.getElementById(calibrateButtonId);
                    calibrateButton.innerText = 'Recalibrate';
                }
            }
        });
        this.initializeMIDI();
        this.addStyleToPage();
        this.addControlsToPage();
        playButton = document.getElementById('scorePlayButton');
        playButton.addEventListener('click', () => {
            isPlaying = !isPlaying;
        });
        document.getElementById(toggleKeyboardWrapperId).addEventListener('click', () => { 
            setTimeout(() => {
                this.observeKeyboardChanges();
            }, 100);
        });
    }
}, 200)
