/**
    * errors.js
    * @fileoverview manages errors received from server
    * @todo add others. maybe replace alerts with a modal display? could look nicer.
*/

socket.on('TOO_FEW_CARDS', () => {
    alert('You must have at least as many cards selected as there are players.')
})
