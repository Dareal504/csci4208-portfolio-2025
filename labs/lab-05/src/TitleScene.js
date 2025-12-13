class TitleScene extends Phaser.Scene{
    constructor(){
        super('title'); // Register scene with key 'title'
    }

    create(){
        //We will ass content here in the next step
        this.create_title()
        this.create_game_data();
        this.create_topscore();
        this.input.keyboard.on('keydown-SPACE', () => {this.scene.start('play');});
    }

    create_title(){
        const width = this.game.config.width;
        const height = this.game.config.height;

        //Game Title
        this.add.text(width / 2, height / 3, 'DODGER GAME', {
            fontSize: '48px',
            fill: '#FFFFFF'
        }).setOrigin(0.5);

        //Instructions
        this.add.text(width / 2, height / 2, 'Arrow Keys to Move\nSpacebar to Fire', {
            fontSize: '24px',
            fill: '#FFFFFF',
            align: 'center' // Center-align multi-line text
        }).setOrigin(0.5);

        //Start prompt
        this.add.text(width / 2, height * 2 / 3, 'Press SPACE to Start', {
            fontSize: '24px',
            fill: '#FFFF00'
        }).setOrigin(0.5);
    }

    create_game_data(){
        //Set defult values in the registry only if they dont already exist
        this.registry.set('top_score', this.registry.get('top_score') || 100);
        this.registry.set('Winner', this.registry.get('Winner') || 'Top Score');
    }

    create_topscore(){
        // Get the top score and winner from the registry
        const topScore = this.registry.get('top_score');
        const winner = this.registry.get('Winner');

        //Display the top Score
        const x = this.game.config.width / 2;
        const y = this.game.config.height - 50;
        this.add.text(x, y, `Leader: ${winner} - ${topScore}`, {
            fontSize: '20px',
            fill: '#FFFFFF'
        }).setOrigin(0.5);

    }
}