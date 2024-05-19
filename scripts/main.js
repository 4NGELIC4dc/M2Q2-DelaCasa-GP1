const config = {
    type: Phaser.AUTO,
    width: 650,
    height: 650,
    parent: 'gameContainer',
    scene: [OpenScene, GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

const game = new Phaser.Game(config);