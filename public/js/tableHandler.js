/**
    * tableHandler.js
    * @fileoverview handles all logic regarding the table clientside. responsible for all HTML
    * elements during the actual game (excluding the top hub). includes functions for all role
    * behaviors
    * @todo behaviors were coded too safely. I wrote them individually without giving too much
    * thought to how their behavior could be modularized. reflecting on them, they have a lot of
    * shared functionality. create functions to do said shared functionality and rewrite appropriate
    * behavior functions
    * @todo in some callbacks, 'data' should really be replaced with a parameters list. this will
    * make it easier to understand what values the callback actually takes
    * @todo this file feels unnecessarily long. try to split it up?
*/

// table HTML elements
const table             = document.getElementById('table')
const tableContent      = document.getElementById('table-content')
const tableInfo         = document.getElementById('table-info')
const originalRoleLabel = document.getElementById('original-role')
const roundLabel        = document.getElementById('round')
const timerBar          = document.getElementById('timer-bar')
const ctx               = timerBar.getContext('2d')

// timer related logic and variables
let roundTime = 0
let initalRoundTime = 0
let clock = undefined

/**
    * @callback - New Round Manager
    * @desc receives a new round name and handles it accordingly
    * @param {string, int} round - the string name and int time of the round
    * @param {Object[], Object[]} data - a list of player objects and a list of middle objects
    * all these objects have a card object
*/
socket.on('new-round', (round, data) => {

    setTimer(round)
    tableContent.innerHTML = ''

    switch(round.name) {
        case 'self peek':
            selfPeek(data.players)
            break
        case 'vote':
            vote(data.players)
            break
        case 'discussion':
            break
        default:
            handleRole(round, data)
            break
    }
})

/**
    * @function setTimer
    * @returns void
    * @desc changes the round label, sets the timer and creates an interval that ticks every second
    * to update the timer's display
    * @param {string, int} round - the round name and the int time for that round
*/
function setTimer(round) {

    roundLabel.innerText = 'Round: ' + round.name
    roundTime = round.time
    initialRoundTime = round.time

    if (typeof clock !== 'undefined') {
        clearTimeout(clock)
    }

    ctx.fillStyle = lgOrange
    ctx.fillRect(0, 0, timerBar.width, timerBar.height)

    clock = setInterval(() => {

        roundTime--
        if (roundTime == 0) {
            clearInterval(clock)
        }
        ctx.clearRect(0, 0, timerBar.width, timerBar.height)
        ctx.fillStyle = lgOrange
        ctx.fillRect(0, 0, timerBar.width * roundTime / initialRoundTime, timerBar.height)

    }, 1000)
}

/**
    * @function handleRole
    * @returns void
    * @desc for rounds that aren't vote, discussion or self peek, this function appropriately routes
    * the round name to a function
    * @param {string, int} round - the string name and int time of the round
    * @param {Object[], Object[]} data - a list of player objects and a list of middle objects
    * all these objects have a card object
*/
function handleRole(round, data) {

    let canAct = false
    switch(round.name) {
        case 'robber':
        case 'troublemaker':
        case 'paranormal investigator':
        case 'doppleganger':
            canAct = local.role === round.name
            break
        default:
            canAct = (local.role === round.name || local.role === 'dopple'+round.name)
            break
    }
    if (canAct) {
        doAction(round.name)(data)
    }
}

/**
    * @function selfPeek
    * @returns void
    * @desc hides settings, shows the table and table info sections. shows player their initial role
    * @param {Object[]} players - a list of player objects
*/
function selfPeek(players) {

    gameSettings.style.display = 'none'
    table.style.display = 'block'
    tableInfo.style.display = 'block'

    // display original role
    let player = players.filter(p => p.name === local.name)[0]
    local.role = player.behavior
    originalRoleLabel.innerText = 'Original Role: ' + local.role
}

/**
    * @function vote
    * @returns void
    * @desc manages all HTML elements related to the vote display
    * @param {Object[]} players - a list of player objects
*/
function vote(players) {

    let voteSect = peekGroup('Select a player to vote for or abstain from voting.', true)

    players.forEach(player => {

        let elt = document.createElement('DIV')
        elt.innerText = player.name
        elt.onclick = () => {

            socket.emit('add-vote', {from: local.name, to: player.name})
            elt.style.backgroundColor = dkOrange
            voteSect.sect.style.pointerEvents = 'none'

        }
        voteSect.list.appendChild(elt)
    })
    tableContent.appendChild(voteSect.sect)
}

/**
    * @callback - Game Over Manager
    * @desc receives a game over and displays the correct game over results. this includes a
    * detailed description of each player's results and state
    * @param {Object[], string[]} data - a list of player objects and a list of winning teams by
    * name
*/
socket.on('game-over', (data) => {

    tableContent.innerHTML = ''

    let winnersStr = 'Winning Teams: '
    data.winners.forEach(winner => {
        winnersStr += winner + ', '
    })
    winnersStr = winnersStr.substring(0, winnersStr.length - 2)

    let resultsLabel = document.createElement('H2')
    resultsLabel.innerText = winnersStr + '. Results: '
    tableContent.appendChild(resultsLabel)
    data.players.forEach(p => {
        tableContent.appendChild(resultSection(p, data.winners))
    })
})

socket.on('reset-game', () => {

    gameSettings.style.display = 'flex'
    table.style.display = 'none'
    tableInfo.style.display = 'none'
    tableContent.innerHTML = ''

})

//--------------------------------------------------------------------------------------------------
// Behavior Functions ------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------

// these functions encapsulate the behavior of each role. they will be significantly changed when
// I add code to better handle shared behaviors so won't give detailed comments yet
function doDoppleganger(data) {

    let doppleSect = peekGroup('pick a player to dopple: ', true)
    let doppled = false

    data.players.filter(player => player.name !== local.name).forEach(player => {

        let elt = document.createElement('DIV')
        elt.innerText = player.name + '\n card: ?'
        elt.onclick = () => {

            if (doppled) {
                return
            }
            doppled = true
            let nc = player.card.name

            let newRoleLabel = document.createElement('P')
            newRoleLabel.innerText = 'your new role is ' + nc
            doppleSect.sect.appendChild(newRoleLabel)
            elt.innerText = player.name + '\n card: ' + nc
            elt.style.backgroundColor = dkOrange

            local.role = 'dopple' + nc
            socket.emit('switch-true-card', local.name, nc)
            socket.emit('switch-behavior', local.name, local.role)

            switch (nc) {
                case 'robber':
                case 'troublemaker':
                case 'paranormal investigator':
                    doAction(nc)(data)
                    break;
                default: break;
            }

        }
        doppleSect.list.appendChild(elt)
    })
    tableContent.appendChild(doppleSect.sect)
}
function doWerewolf(data){

    let soloWolf = data.players.filter(player => player.behavior.includes('werewolf')).length == 1
    if (soloWolf) {

        let peeksLeft = 1
        let midPeeksSect = peekGroup('Pick a middle card to peek.', true)
        for (let i = 0; i < data.middle.length; i++) {
            let elt = document.createElement('DIV')
            elt.innerText = data.middle[i].name + '\n card: ?'
            elt.onclick = () => {
                if (peeksLeft > 0) {
                    if (data.middle[i].card.name !== 'werewolf' || settings.haplessSoloWolf.checked) {
                        peeksLeft--
                    }
                    elt.innerText = data.middle[i].name + '\n card: ' + data.middle[i].card.name
                    elt.style.backgroundColor = dkOrange
                }
            }
            midPeeksSect.list.appendChild(elt)
        }
        tableContent.appendChild(midPeeksSect.sect)

    } else {

        let wolfSect = peekGroup('Your fellow wolves are: ', false)
        findByBehavior(data.players, 'werewolf', wolfSect.list)
        tableContent.appendChild(wolfSect.sect)

    }
}
function doMinion(data) {

    let wolves = data.players.filter(p => p.behavior.includes('werewolf'))
    let str = wolves.length == 0 ? 'Nobody stuck out their thumb.' : 'These players stuck out their thumbs: '
    let wolfSect = peekGroup(str, false)
    findByBehavior(data.players, 'werewolf', wolfSect.list)
    tableContent.appendChild(wolfSect.sect)

}
function doApprenticeSeer(data) {

    let midPeeks = 1
    let midPeeksSect = peekGroup('Pick a middle card to peek:', true)

    for (let i = 0; i < data.middle.length; i++) {

        let elt = document.createElement('DIV')
        elt.innerText = data.middle[i].name + '\n card: ?'
        elt.onclick = () => {

            if (midPeeks > 0) {

                midPeeks--
                otherPeeks = 0
                elt.innerText = data.middle[i].name + '\n card: ' + data.middle[i].card.name
                elt.style.backgroundColor = dkOrange

            }

        }
        midPeeksSect.list.appendChild(elt)
    }
    tableContent.appendChild(midPeeksSect.sect)
}
function doSeer(data){

    var midPeeks = 2
    var otherPeeks = 1

    let midPeeksSect = peekGroup('Pick two middle cards to peek:', true)
    let otherPeekSect = peekGroup('Or pick one player card to peek:', true)

    for (let i = 0; i < data.middle.length; i++) {

        let elt = document.createElement('DIV')
        elt.innerText = data.middle[i].name + '\n card: ?'
        elt.onclick = () => {

            if (midPeeks > 0) {

                midPeeks--
                otherPeeks = 0
                elt.innerText = data.middle[i].name + '\n card: ' + data.middle[i].card.name
                elt.style.backgroundColor = dkOrange

            }

        }
        midPeeksSect.list.appendChild(elt)
    }
    for (let i = 0; i < data.players.length; i++) {

        let elt = document.createElement('DIV')
        elt.innerText = data.players[i].name + '\n card: ?'
        elt.onclick = () => {

            if (otherPeeks > 0) {

                otherPeeks--
                midPeeks = 0
                elt.innerText = data.players[i].name + '\n card: ' + data.players[i].card.name
                elt.style.backgroundColor = dkOrange

            }
        }
        otherPeekSect.list.appendChild(elt)
    }

    tableContent.appendChild(midPeeksSect.sect)
    tableContent.appendChild(otherPeekSect.sect)

}
function doMason(data) {

    let masonGroup = peekGroup('Your fellow masons are: ', false)
    findByBehavior(data.players, 'mason', masonGroup.list)
    tableContent.appendChild(masonGroup.sect)

}
function doInsomniac(data) {

    let myCard = data.players.filter(player => player.name === local.name)[0].card.name
    let myCardLabel = document.createElement('P')
    myCardLabel.innerText = 'Your card is now: ' + myCard
    tableContent.appendChild(myCardLabel)

}
function doRobber(data) {

    let swapSect = peekGroup('pick a players card to swap with yours: ', true)
    let swapped = false

    data.players.filter(player => player.name !== local.name).forEach(player => {

        let elt = document.createElement('DIV')
        elt.innerText = player.name + '\n card: ?'
        elt.onclick = () => {

            if (!swapped) {

                swapped = true
                let newRoleLabel = document.createElement('P')
                newRoleLabel.innerText = 'your new card is ' + player.card.name
                swapSect.sect.appendChild(newRoleLabel)
                elt.innerText = player.name + '\n card: robber'
                elt.style.backgroundColor = dkOrange
                socket.emit('swap', {p1: local.name, p2: player.name})

            }

        }
        swapSect.list.appendChild(elt)

    })
    tableContent.appendChild(swapSect.sect)

}
function doTroublemaker(data) {

    let swapSect = peekGroup('pick two players to swap: ', true)
    let selected = []

    data.players.filter(player => player.name !== local.name).forEach(player => {

        let elt = document.createElement('DIV')
        elt.innerText = player.name
        elt.onclick = () => {

            if (selected.length < 2 && selected.indexOf(player.name) == -1) {

                selected.push(player.name)
                elt.style.backgroundColor = dkOrange
                if (selected.length == 2) {

                    socket.emit('swap', {p1: selected[0], p2: selected[1]})
                    let successLabel = document.createElement('P')
                    successLabel.innerText = 'you swapped ' + selected[0] + ' and ' + selected[1]
                    swapSect.sect.appendChild(successLabel)

                }
            }
        }
        swapSect.list.appendChild(elt)
    })
    tableContent.appendChild(swapSect.sect)
}
function doParanormalInvestigator(data) {

    let peekSect = peekGroup('pick two players to peek: ', true)
    let selected = 0

    data.players.filter(player => player.name !== local.name).forEach(player => {

        let elt = document.createElement('DIV')
        elt.innerText = player.name + '\n card: ?'
        elt.onclick = () => {

            if (selected < 2) {

                selected++
                elt.innerText = player.name + '\n card ' + player.card.name
                elt.style.backgroundColor = dkOrange
                if (player.card.trueName === 'werewolf' || player.card.trueName === 'minion' || player.card.trueName === 'tanner') {
                    socket.emit('switch-true-card', local.name, player.card.trueName)
                }
                if (player.card.name === 'werewolf' || player.card.name === 'minion' || player.card.name === 'tanner') {
                    selected = 2
                    let evilLabel = document.createElement('P')
                    evilLabel.innerText = 'You\'ve joined the ' + (player.card.trueName === 'tanner' ? 'tanners!' : 'werewolves!')
                    peekSect.sect.appendChild(evilLabel)
                }
            }
        }
        peekSect.list.appendChild(elt)
    })
    tableContent.appendChild(peekSect.sect)
}

//--------------------------------------------------------------------------------------------------
// Helper Functions --------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------

/**
    * @function peekGroup
    * @returns {HTMLObject, HTMLObject, HTMLObject}
    * @desc creates a encapsulated group of HTML elements that has a text instruction and a list of
    * items that may or may not be clickable. the clicking functionality, if any, is determined in
    * the behavior functions
    * @param {string} instr - the string description of the section
    * @param {boolean} clickable - whether or not the list of items is clickable
*/
function peekGroup(instr, clickable) {

    let sect = document.createElement('DIV')
    sect.className = 'instruction-section'
    sect.style.backgroundColor = clickable ? lgOrange : lgYellow

    let instrP = document.createElement('P')
    instrP.innerText = instr

    let groupList = document.createElement('DIV')
    groupList.className = clickable ? 'clickable-items' : 'list-items'
    sect.appendChild(instrP)
    sect.appendChild(groupList)

    return {sect, title: instrP, list: groupList}

}

/**
    * @function findByBehavior
    * @returns void
    * @desc appends a list of elements with the names of players who have a certain behavior. i.e.
    * a list of players who have werewolf behavior
    * @param {Object[]} players - the array of player objects which will be searched over
    * @param {string} behavior - the behavior we are looking for
    * @param {HTMLObject} list - the HTML object we will be appending all children who match our
    * search too
*/
function findByBehavior(players, behavior, list) {
    players.filter(player => player.behavior.includes(behavior) && player.name !== local.name).forEach(player => {
        let elt = document.createElement('DIV')
        elt.innerText = player.name
        list.appendChild(elt)
    })
}

/**
    * @function getTeam
    * @returns {string} team name
    * @desc given a card name, this function returns the team it is on
    * @param {string} name - the name of the card
*/
function getTeam(name) {
    if (name === 'tanner') {
        return 'tanners'
    }
    return ((name === 'werewolf' || name === 'minion') ? 'werewolves' : 'villagers')
}

/**
    * @function doAction
    * @returns {Function}
    * @desc cleans and parses the name of the round to return the appropriate function for that
    * round
    * @param {string} name - the name of the round
*/
function doAction(name) {
    let words = name.split(' ')
    let cleanedName = 'do'
    words.forEach(word => {
        cleanedName += word.charAt(0).toUpperCase() + word.slice(1)
    })
    return eval(cleanedName)
}

/**
    * @function resultSection
    * @returns {HTMLObject}
    * @desc creates a encapsulated group of HTML elements that has a textual information about the
    * player and whether or not they won the round
    * @param {Object} p - the player object
    * @param {string[]} winners - the list of winning teams
*/
function resultSection(p, winners) {

    let elt = document.createElement('DIV')
    elt.className = 'result-section'
    let color = ''
    switch(getTeam(p.card.trueName)) {
        case 'villagers':
            color = lgBlue
            break
        case 'werewolves':
            color = lgRed
            break
        default:
            color = lgGreen
            break
    }
    elt.style.backgroundColor = color

    let name = p.name + ((winners.indexOf(getTeam(p.card.trueName)) != -1) ? ' won!' : ' lost.')
    let nameLabel = document.createElement('H2')
    nameLabel.innerText = name
    elt.appendChild(nameLabel)

    let originalCard = ' Behavior: ' + p.behavior
    let originalCardLabel = document.createElement('P')
    originalCardLabel.innerText = originalCard
    elt.appendChild(originalCardLabel)

    let currentCard = ' Current Card: ' + p.card.name
    let currentCardLabel = document.createElement('P')
    currentCardLabel.innerText = currentCard
    elt.appendChild(currentCardLabel)

    let votes = p.votes
    let votesLabel = document.createElement('P')
    votesLabel.innerText = ' Votes: ' + votes
    elt.appendChild(votesLabel)

    let votedFor = p.hasOwnProperty('votedFor') ? p.votedFor : 'abstained'
    let votedForLabel = document.createElement('P')
    votedForLabel.innerText = ' Voted For: ' + votedFor
    elt.appendChild(votedForLabel)

    return elt

}
