/**
    * settings.js
    * @fileoverview all the javascript for lobby settings and lobby top hub
    * @todo make relationship between server settings and displayed settings a little less
    * clunky? right now its okay but there's probably a better solution
*/

// colors from {@link public/css/base.css}
const bgRed     = getComputedStyle(document.documentElement).getPropertyValue('--bg-red')
const lgRed     = getComputedStyle(document.documentElement).getPropertyValue('--lg-red')
const bgBlue    = getComputedStyle(document.documentElement).getPropertyValue('--bg-blue')
const lgBlue    = getComputedStyle(document.documentElement).getPropertyValue('--lg-blue')
const bgPurple  = getComputedStyle(document.documentElement).getPropertyValue('--bg-purple')
const lgPurple  = getComputedStyle(document.documentElement).getPropertyValue('--lg-purple')
const bgGreen   = getComputedStyle(document.documentElement).getPropertyValue('--bg-green')
const lgGreen   = getComputedStyle(document.documentElement).getPropertyValue('--lg-green')
const lgOrange  = getComputedStyle(document.documentElement).getPropertyValue('--lg-orange')
const bgOrange  = getComputedStyle(document.documentElement).getPropertyValue('--bg-orange')
const dkOrange  = getComputedStyle(document.documentElement).getPropertyValue('--dk-orange')
const lgYellow  = getComputedStyle(document.documentElement).getPropertyValue('--lg-yellow')
const bgYellow  = getComputedStyle(document.documentElement).getPropertyValue('--bg-yellow')

// add user to the correct room on server
socket.emit('room-connection', local.name)

//--------------------------------------------------------------------------------------------------
// Top Hub -----------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------

const restartButton = document.getElementById('restart-button')
restartButton.onclick = () => {
    socket.emit('reset-game-req')
}

const gameSettings = document.getElementById('game-settings')
const captLabel = document.getElementById('capt-label')
socket.on('new-capt', captName => {

    captLabel.innerText = 'Room Captain: ' + captName
    gameSettings.style.pointerEvents = (local.name === captName) ? 'auto' : 'none'
    restartButton.style.pointerEvents = (local.name === captName) ? 'auto' : 'none'

})

const playerList = document.getElementById('player-list')
socket.on('player-list-change', pl => {

    let playerListStr = 'Players: '
    for (let p in pl) {
        playerListStr += pl[p].name + ', '
    }
    playerListStr = playerListStr.substring(0, playerListStr.length - 2)
    playerList.innerText = playerListStr

})

//--------------------------------------------------------------------------------------------------
// Game Settings -----------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------

const villageCardToggles        = document.getElementById('village-card-toggles')
const werewolfCardToggles       = document.getElementById('werewolf-card-toggles')
const ambiguousCardToggles      = document.getElementById('ambiguous-card-toggles')
const independentCardToggles    = document.getElementById('independent-card-toggles')

// list of HTMLObjects that represent each card
let cards = []

let temp = ['troublemaker','robber', 'seer', 'insomniac', 'villager', 'bodyguard', 'prince',
    'hunter', 'apprentice seer', 'mason', 'mason']
addCardsToSettings(villageCardToggles, temp, cards)
temp = ['werewolf', 'werewolf', 'minion']
addCardsToSettings(werewolfCardToggles, temp, cards)
temp = ['doppleganger', 'paranormal investigator']
addCardsToSettings(ambiguousCardToggles, temp, cards)
temp = ['tanner']
addCardsToSettings(independentCardToggles, temp, cards)

socket.on('card-change-res', (cardIndex, on) => {
    cards[cardIndex].checked = on
})

const timeSliders = document.getElementById('time-sliders')
const miscellaniousOptions = document.getElementById('miscellanious-options')

// list of HTMLObjects that represent each setting
let settings = {
    regTime: makeSliderAndLabel('regTime', 'Time per regular role', 5, 60, timeSliders),
    complexTime: makeSliderAndLabel('complexTime', 'Time per complex role', 5, 60, timeSliders),
    discussionTime: makeSliderAndLabel('discussionTime', 'Time allocated to discussing the night',
        10, 6 * 60, timeSliders),
    haplessSoloWolf: makeToggleAndLabel('haplessSoloWolf', 'Hapless Solo Werewolf: A solo wolf may '
        + 'not look at another middle card if the first middle card they saw was a werewolf.',
        false, miscellaniousOptions),
    flawlessVictory: makeToggleAndLabel('flawlessVictory', 'Flawless Victory: Villagers can only '+
        'win if only werewolves die. If a villager/villagers also die, they lose.',
        false, miscellaniousOptions),
    rogueMinion: makeToggleAndLabel('rogueMinion', 'Rogue Minion: A minion with no werewolves is '+
        'treated as a werewolf. Villagers can only win if he dies.', true, miscellaniousOptions)
}

socket.on('settings-change-res', (settingName, state) => {

    if(settings[settingName].type === 'range') {
        settings[settingName].value = state
        settings[settingName].oninput()
    } else {
        settings[settingName].checked = state
    }

})

const startGame = document.getElementById('start-game')
startGame.onclick = () => {
    socket.emit('start-game')
}

//--------------------------------------------------------------------------------------------------
// Helper Functions --------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------

/**
    * @function addCardsToSettings
    * @returns void
    * @desc turns a list of card names and adds them as clickable checkboxes
    * to the appropriate card toggle section
    * @param {HTMLObject} settingsSection - the html parent for all the checkbox elements
    * @param {string[]} cardList - a string list of the card names
    * @param {HTMLObject[]} cardObjList - a list of the checkboxes, used so that we can easiy access
    * these checkboxes and change their state if the room captain made a settings change
*/
function addCardsToSettings(settingsSection, cardList, cardObjList) {
    for (let i = 0; i < cardList.length; i++) {
        let cardCheckbox = document.createElement('INPUT')
        let currLen = cardObjList.length
        cardCheckbox.type = 'checkbox'
        cardCheckbox.onclick = ((e) => {
            socket.emit('card-change-req', cardList[i], currLen, cardCheckbox.checked)
        })
        settingsSection.appendChild(cardCheckbox)
        cardObjList.push(cardCheckbox)

        let cardLabel = document.createElement('SPAN')
        cardLabel.innerText = cardList[i]
        settingsSection.appendChild(cardLabel)
    }
}

/**
    * @function makeSliderAndLabel
    * @returns {HTMLObject} slider
    * @desc makes a slider and its label for a certain time setting
    * @param {string} settingsName - the name of the setting the slider controls
    * @param {string} desc - description for the slider
    * @param {int} min - the minimum value of the slider
    * @param {int} max - the maximum value of the slider
    * @param {HTMLObject} parent - the HTML parent of the slider and its label
*/
function makeSliderAndLabel(settingName, desc, min, max, parent) {
    let descLabel = document.createElement('P')
    let slider = document.createElement('INPUT')
    slider.type = 'range'
    slider.min = min
    slider.max = max
    slider.oninput = () => {
        descLabel.innerText = desc + ': ' + getTime(slider.value)
    }
    slider.onchange = () => {
        socket.emit('settings-change-req', settingName, slider.value)
    }
    descLabel.innerText = desc + ': ' + getTime(slider.value)
    parent.append(descLabel)
    parent.append(slider)
    return slider
}

/**
    * @function makeToggleAndLabel
    * @returns {HTMLObject} checkbox
    * @desc makes a checkbox and its label for a certain setting
    * @param {string} settingsName - the name of the setting the toggle controls
    * @param {string} desc - description for the togglable setting
    * @param {boolean} on - whether the setting is originally on or not
    * @param {HTMLObject} parent - the HTML parent of the checkbox and its label
*/
function makeToggleAndLabel(settingName, desc, on, parent) {
    let descLabel = document.createElement('P')
    descLabel.innerText = desc
    let checkbox = document.createElement('INPUT')
    checkbox.type = 'checkbox'
    checkbox.checked = on
    checkbox.onchange = () => {
        socket.emit('settings-change-req', settingName, checkbox.checked)
    }
    parent.appendChild(descLabel)
    parent.appendChild(checkbox)
    return checkbox
}

/**
    * @function getTime
    * @returns {string} time
    * @desc makes a string representation of the input time given in seconds
    * @param {int} seconds - the number of seconds
*/
function getTime(seconds) {
    let m = Math.floor(seconds / 60)
    let s = seconds % 60
    let mStr = (m > 0 ? (m == 1) ? m + ' minute ' : m + ' minutes ' : '')
    let sStr = (s > 0 ? (s == 1) ? s + ' second ' : s + ' seconds ' : '')
    return mStr + sStr
}
