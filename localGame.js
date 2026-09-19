/* =========================================================================
 * 🎲 localGame.js - 單機傳機模式引擎 (Pass & Play Engine)
 * ========================================================================= */
class LocalBombGame {
  constructor(playerNames, targetNumber = null) {
    this.players = playerNames;
    this.turnIndex = 0;
    this.range = [1, 100];
    this.targetNumber = targetNumber || (Math.floor(Math.random() * 98) + 2);
    this.isOver = false;
  }

  getCurrentPlayer() {
    return this.players[this.turnIndex];
  }

  submitGuess(num) {
    const val = Number(num);
    const [min, max] = this.range;

    if (val <= min || val >= max) {
      return { success: false, error: 'OUT_OF_RANGE' };
    }

    if (val === this.targetNumber) {
      this.isOver = true;
      return {
        success: true,
        boom: true,
        loser: this.getCurrentPlayer(),
        number: this.targetNumber
      };
    }

    if (val > this.targetNumber) this.range[1] = val;
    else this.range[0] = val;

    this.turnIndex = (this.turnIndex + 1) % this.players.length;
    return {
      success: true,
      boom: false,
      nextRange: this.range,
      nextPlayer: this.getCurrentPlayer()
    };
  }
}
