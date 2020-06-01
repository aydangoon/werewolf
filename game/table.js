/**
    * table.js
    * @fileoverview all server js for table/game functionality
    * @todo add good documentation
*/

function Table(players, cards, settings) {

    // state
    this.players = []
    this.middle = []
    this.rounds = []
    this.roundInd = -1
    this.winners = []

    // constructor stuff
    for (pid in players) {
        this.players.push({ id: pid, name: players[pid].name })
    }
    assignBehaviorAndOriginalCards(this.players, cards, this.middle) // creates the middle, and gives every player their card and original behavior
    assignRounds(cards, this.rounds, settings) // fills rounds array with appropriate objects

    this.updateRound = () => {
        if (this.roundInd == this.rounds.length - 1) {
            this.determineWinner()
            return 'game over'
        }
        this.roundInd++
        return this.rounds[this.roundInd]
    }

    this.swap = (p1, p2) => {
        let toSwap = this.players.concat(this.middle).filter(p => p.name === p1 || p.name === p2)
        let temp = toSwap[0].card
        toSwap[0].card = toSwap[1].card
        toSwap[1].card = temp
        console.log('there was a swap', toSwap)
    }

    this.switchTrueCard = (name, newCard) => {
        let player = this.playerByName(name)
        player.card.trueName = newCard
    }

    this.switchBehavior = (name, newBehavior) => {
        let player = this.playerByName(name)
        player.behavior = newBehavior
    }

    this.addVote = (from, to) => {

        let fromPlayer = this.playerByName(from)
        let toPlayer = this.playerByName(to)
        let isBg = fromPlayer.card.trueName === 'bodyguard'
        if (isBg) {
            toPlayer.protected = true
        } else {
            toPlayer.votes++
        }
        fromPlayer.votedFor = toPlayer.name

    }

    this.determineWinner = () => {

        let mostVotes = []
        this.players.forEach(p => {

            if (p.votes <= 0) { return }

            if (mostVotes.length == 0 || p.votes == mostVotes[0].votes) {
                mostVotes.push(p)
            } else if (p.votes > mostVotes[0].votes){
                mostVotes = [p]
            }
        })
        let villagerDied = false
        let werewolfDied = false
        let tannerDied = false
        let deathFunction = (p, call=1) => {
            let canDie = !p.protected
            switch(p.card.trueName) {
                case 'tanner':
                    tannerDied = canDie
                    break
                case 'werewolf':
                    werewolfDied = canDie
                    break
                case 'minion':
                    if (this.players.filter(p2 => p2.card.trueName === 'werewolf').length == 0 && settings.rogueMinion) {
                        werewolfDied = canDie
                    } else {
                        villagerDied = canDie
                    }
                    break
                case 'prince':
                    break
                case 'hunter': // big ew. I hate casing. find better way
                    villagerDied = canDie
                    if (call < 3 && p.hasOwnProperty('votedFor')) {
                        let tgt = this.playerByName(p.votedFor)
                        deathFunction(tgt, call+1)
                    }
                    break
                default:
                    villagerDied = canDie
                    break
            }
        }
        console.log(mostVotes)
        mostVotes.forEach(p => {deathFunction(p)})

        let noWolves = this.players.filter(p => p.card.trueName === 'werewolf' || p.card.trueName === 'minion').length == 0
        if (!werewolfDied && !noWolves) {
            this.winners.push('werewolves')
        } else if ((werewolfDied && (!settings.flawlessVictory || !villagerDied)) || (noWolves && !villagerDied)) {
            this.winners.push('villagers')
        } else {
            this.winners.push('nobody')
        }
        if (tannerDied) {
            this.winners.push('tanners')
        }

    }

    this.playerByName = (name) => {
        return this.players.filter(p => p.name === name)[0]
    }
}

function assignBehaviorAndOriginalCards(players, roles, middle) {
    let temp = []
    for (let role in roles) {
        temp.push(roles[role])
    }
    for (let i = 0; i < players.length; i++) {
        let cardName = temp.splice(Math.random() * temp.length, 1)[0]
        players[i].behavior = cardName
        players[i].card = {name: cardName, trueName: cardName}
        players[i].votes = 0
        players[i].protected = false
    }

    for (let i = 0; i < temp.length; i++) {
        middle.push({ name: `middle ${i + 1}`, card: {name: temp[i], team: temp[i]} })
    }
}

function assignRounds(roles, rounds, settings) {
    rounds.push({name: 'self peek', time: 10})
    let order = ['doppleganger', 'werewolf', 'minion', 'mason', 'seer', 'apprentice seer', 'paranormal investigator', 'robber', 'troublemaker', 'insomniac']
    for (let role in order) {
        if (roles.indexOf(order[role]) != -1) {
            rounds.push({name: order[role], time: isComplexRole(order[role]) ? settings.complexTime : settings.regTime })
        }
    }
    rounds.push({name: 'discussion', time: settings.discussionTime})
    rounds.push({name: 'vote', time: 10})
}

function isComplexRole(cardName) {
    return (cardName === 'seer' || cardName === 'werewolf'
    || cardName === 'robber' || cardName === 'troublemaker' || cardName === 'doppleganger')
}

module.exports = Table
