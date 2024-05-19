class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.bgMusic = null;
        this.startTime = 0;
        this.spawnEvent = null;
        this.gameOverFlag = false;
        this.timerEvent = null;
    }

    init(data) {
        this.resetRequested = data.reset || false;
    }

    preload() {
        // Load assets
        this.load.image('background', 'assets/png/space background.png');
        this.load.image('ship', 'assets/png/ship.png');
        this.load.image('bullet', 'assets/png/bullet.png');
        this.load.image('asteroid', 'assets/png/asteroid.png');
        this.load.image('gameOverText', 'assets/png/text_game over.png');
        this.load.image('retryButton', 'assets/png/button-blue01_retry.png');
        this.load.image('menuButton', 'assets/png/button-blue01_menu.png');
        this.load.spritesheet('explosion', 'assets/png/scifi_explosion_spritesheet.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.audio('bgMusic', 'assets/mp3/The Whole Other - 8Bit Dreamscape.mp3');
        this.load.audio('explosion', 'assets/mp3/explosion sfx.mp3');
        this.load.audio('laser', 'assets/mp3/laser gun sfx.mp3');
        this.load.audio('buttonClick', 'assets/mp3/button click sfx.mp3');
    }

    create() {
        // Create game elements
        this.background = this.add.tileSprite(0, 0, this.game.config.width, this.game.config.height, 'background').setOrigin(0, 0);
        this.player = this.physics.add.sprite(this.game.config.width / 2, this.game.config.height - 50, 'ship').setCollideWorldBounds(true).setScale(0.95);
        this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 30 });
        this.asteroids = this.physics.add.group();
        this.physics.add.overlap(this.bullets, this.asteroids, this.hitAsteroid, null, this);
        this.physics.add.collider(this.player, this.asteroids, this.gameOver, null, this);
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.spawnEvent = this.time.addEvent({
            delay: 1000,
            callback: this.spawnAsteroid,
            callbackScope: this,
            loop: true
        });

        this.asteroidHealth = new Map();

        this.anims.create({
            key: 'explode',
            frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 6 }),
            frameRate: 10,
            repeat: 0,
            hideOnComplete: true
        });

        this.asteroidsDestroyed = 0;
        this.survivalTime = 0;
        this.scoreText = this.add.text(10, 10, 'Asteroids Destroyed: 0\nTime Survived: 00:00', { fontSize: '20px', fill: '#ffffff' });

        if (!this.bgMusic || !this.bgMusic.isPlaying) {
            this.bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.5 });
            this.bgMusic.play();
        }

        this.startTimer();

        if (this.resetRequested) {
            this.resetGame();
        }
    }

    update() {
        this.background.tilePositionY -= 2;

        this.player.setVelocityX(0);
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-300);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(300);
        }

        if (Phaser.Input.Keyboard.JustDown(this.spaceBar)) {
            this.shootBullet();
        }

        this.bullets.children.each(bullet => {
            if (bullet.active && bullet.y < 0) {
                bullet.setActive(false);
                bullet.setVisible(false);
            }
        });

        this.updateSurvivalTime();
    }

    startTimer() {
        this.startTime = this.time.now;
        this.survivalTime = 0;
        this.gameOverFlag = false;
        if (this.timerEvent) {
            this.timerEvent.remove(false); 
        }
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.updateSurvivalTime,
            callbackScope: this,
            loop: true
        });
    }

    shootBullet() {
        const bullet = this.bullets.get(this.player.x, this.player.y - 20);
        if (bullet) {
            bullet.enableBody(true, this.player.x, this.player.y - 20, true, true);
            bullet.body.velocity.y = -300;
            bullet.body.setAllowGravity(false);
            bullet.setScale(0.95);
            this.sound.play('laser', { volume: 0.5 });
        }
    }

    spawnAsteroid() {
        const x = Phaser.Math.Between(20, this.game.config.width - 20);
        const y = 0;
        const speed = Phaser.Math.Between(100, 200);
        const asteroid = this.asteroids.create(x, y, 'asteroid');
        asteroid.setVelocityY(speed);
        asteroid.setScale(0.05);
        this.asteroidHealth.set(asteroid, 5);
    }

    hitAsteroid(bullet, asteroid) {
        bullet.disableBody(true, true);

        const health = this.asteroidHealth.get(asteroid);
        if (health > 1) {
            this.asteroidHealth.set(asteroid, health - 1);
        } else {
            const explosion = this.add.sprite(asteroid.x, asteroid.y, 'explosion').setScale(2).play('explode');
            asteroid.disableBody(true, true);
            asteroid.setVisible(false);
            this.asteroidHealth.delete(asteroid);
            this.asteroidsDestroyed += 1;
            this.updateScoreText();
            this.sound.play('explosion', { volume: 0.5 });
        }
    }

    gameOver() {
        this.sound.play('explosion', { volume: 0.5 });

        this.asteroids.getChildren().forEach(asteroid => {
            const explosion = this.add.sprite(asteroid.x, asteroid.y, 'explosion').setScale(2).play('explode');
            asteroid.disableBody(true, true);
        });

        this.bullets.clear(true, true);

        this.physics.pause();
        this.player.setTint(0xff0000);

        this.spawnEvent.remove(false);

        this.gameOverFlag = true;

        this.gameOverText = this.add.image(this.game.config.width / 2, this.game.config.height / 2 - 100, 'gameOverText').setOrigin(0.5).setScale(0.35);

        // Retry Button
        this.retryButton = this.add.image(this.game.config.width / 2, this.game.config.height / 2, 'retryButton').setOrigin(0.5).setInteractive().setScale(1);
        this.retryButton.on('pointerdown', () => {
            this.sound.play('buttonClick', { volume: 0.5 });
            this.scene.restart({ reset: true });
        });
        this.retryButton.on('pointerover', () => this.retryButton.setTint(0xaaaaaa));
        this.retryButton.on('pointerout', () => this.retryButton.clearTint());

        // Menu Button
        this.menuButton = this.add.image(this.game.config.width / 2, this.game.config.height / 2 + 100, 'menuButton').setOrigin(0.5).setInteractive().setScale(1);
        this.menuButton.on('pointerdown', () => {
            this.sound.play('buttonClick', { volume: 0.5 });
            this.bgMusic.stop();
            this.cleanup();
            this.scene.start('OpenScene');
        });
        this.menuButton.on('pointerover', () => this.menuButton.setTint(0xaaaaaa));
        this.menuButton.on('pointerout', () => this.menuButton.clearTint());
    }

    resetGame() {
        this.physics.resume();
        this.player.clearTint();
        this.asteroids.clear(true, true);
        this.bullets.clear(true, true);
        this.asteroidsDestroyed = 0;
        this.survivalTime = 0;
        this.gameOverFlag = false;
        this.startTimer();
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(`Asteroids Destroyed: ${this.asteroidsDestroyed}\nTime Survived: ${this.formatTime(this.survivalTime)}`);
    }

    formatTime(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
        return (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }

    updateSurvivalTime() {
        if (!this.gameOverFlag) {
            this.survivalTime = this.time.now - this.startTime;
            this.updateScoreText();
        }
    }

    shutdown() {
        if (this.timerEvent) {
            this.timerEvent.remove(false);
        }
        this.time.removeAllEvents();
        this.survivalTime = 0; 
        this.startTime = 0; 
        super.shutdown();
    }

    cleanup() {
        if (this.timerEvent) {
            this.timerEvent.remove(false);
        }
        this.time.removeAllEvents();
        this.gameOverFlag = true;
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.stop();
        }
    }
}