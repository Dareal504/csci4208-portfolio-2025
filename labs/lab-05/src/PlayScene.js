class PlayScene extends Phaser.Scene {
    //construct new scene 
    constructor() {
        super('play');  // set this scene's id within superclass constructor
      
    }

    //preload external game assets
    preload(){
        this.load.path = 'assets/';  //Define file path
        this.load.image('background', 'background.png'); // Load tile images
        this.load.image( 'player', 'player.png');    // Load player image
        this.load.image('enemy', 'enemy.png');      //Load enemy image
        this.load.image( 'player-0', 'player-0.png'); //Load walk frame 0
        this.load.image( 'player-1', 'player-1.png'); // Load walk frame 1
        this.load.image( 'enemy-0', 'enemy-0.png');
        this.load.image( 'enemy-1', 'enemy-1.png');
        this.load.image( 'projectile', 'projectile.png' ); //Load projectile image
        this.load.image('powerup-projectile', 'powerup-1.png');
        this.load.image('powerup-slay', 'powerup-2.png');

         // Enemy bullets group
         this.enemyBullets = this.physics.add.group({
            classType: Projectile,
            runChildUpdate: false,
            maxSize: 100
        });
    }

    //create game data
    create(){
        this.create_map();   //create level
        this.create_projectiles(); //create projectiles
        this.create_animations(); //create animations
        this.create_player();  //helper method: create player
        this.create_enemies();   //helper method: create enemies
        this.create_powerups();
        this.create_collisions();   //create physics-related behaviors
        this.create_hud();      //create hud
        this.input.keyboard.on('keydown-ESC', () => {this.scene.start('title');});

    }

    //Update game data
    update(time){
        this.update_player(time);
        this.update_background();
        this.update_score();
        this.update_enemies(time);
    }

    //Load Level
    create_map(){
        this.background = this.add.tileSprite(640/2, 480/2, 640, 480, 'background');
    }

    //Create Game World
    create_player() {
        this.player = new Player(this);   //create player
    }

    //update game state
    update_player(time){
        this.player.move();
        this.player.attack(time);
    }

    create_enemies() {
        this.enemies = [];

        const event = new Object();
        event.delay = 200;
        event.callback = this.spawn_enemy;
        event.callbackScope = this;
        event.loop = true;

        this.time.addEvent(event);
    }

    spawn_enemy(){
        const position = {};
        position.x = 640 + 32;
        position.y = Phaser.Math.Between(0, 480);

        const monster = new Enemy(this, position);
        this.enemies.push(monster);
        this.score +=1;
    }

    //sets up overlap collisons behaviors
    create_collisions(){
        this.physics.add.overlap(this.player, this.enemies, this.game_over, null, this);
        this.physics.add.overlap(this.player_projectiles, this.enemies, this.slay_enemy,null,this);
        this.physics.add.overlap(this.enemy_projectiles,this.player,this.game_over,null,this);
        this.physics.add.overlap(this.player, this.powerups, this.collect_powerup, null, this);
    }

    game_over(){
        const {top_score, winner} = this.registry.values;
        if(this.score >= top_score){
            this.registry.set('top_score', this.score);
            this.physics.pause();   //Freeze gameplay
            const winner = prompt(`New High Score! Enter your name:`);
            this.registry.set('winner', winner || 'Top Score');   // Use 'Top Score' if null
            this.input.keyboard.keys = [];
        }
        this.cameras.main.flash();
        this.scene.restart();
    }

    update_background(){
        this.background.tilePositionX += 3;
    }

    //create animations
    create_animations(scene){
        if( !this.anims.exists('player-move')){

            const anim_player_move = new Object();
            anim_player_move.key = 'player-move';   //key to register into phaser
            anim_player_move.frames = [{key: 'player-0'}, {key: 'player-1'}];   //list of image keys for anim
            anim_player_move.frameRate = 6;     //speed to play animation
            anim_player_move.repeat = -1;     //-1 for infinite loop

            this.anims.create(anim_player_move);
        }
        if( !this.anims.exists('enemy-move')){
            const anim_enemy_move = new Object();
            anim_enemy_move.key = 'enemy-move';
            anim_enemy_move.frames = [{key: 'enemy-0'}, {key: 'enemy-1'}];
            anim_enemy_move.frameRate = 6;
            anim_enemy_move.repeat = -1;
            this.anims.create(anim_enemy_move);
        }
    }

    create_hud(){
        this.score =0;
        this.score_text = this.add.text(32, 32, "");
        this.score_text.depth = 3;
        this.score_text.setColor('rgb(255,255,255)');

        const {winner,top_score} = this.registry.values;
        this.top_score_text = this.add.text( 600, 32, `${winner}: ${top_score}`);     //on a 640x480 size scene
        this.top_score_text.depth = 3;
        this.top_score_text.setOrigin(1,0);
    }

    update_score(){
        this.score_text.setText(`Score: ${this.score}`);
        const {winner, top_score} = this.registry.values;
        this.top_score_text.setText(`${winner}: ${top_score}`);
    }

    create_projectiles(){
        this.player_projectiles = [];
        this.enemy_projectiles = [];
    }

    slay_enemy(projectile, enemy){
        enemy.destroy();
        projectile.destroy();
    }

    update_enemies(time) {
        this.enemies.forEach(enemy => enemy.attack(time));
    }

    create_powerups(){
        this.powerups = [];

        const event = new Object();
        event.delay = 3000;
        event.callback = this.spawn_powerup;
        event.callbackScope = this;
        event.loop = true;

        this.time.addEvent(event, this);
    }

    spawn_powerup(){
        this.powerup_types = [ProjectilePowerUp, SlayPowerUp]
        if(Phaser.Math.Between(0,4) !== 0) return;

        //1. Pick a PowerUp CLASS
        const PowerUpClass = Phaser.Utils.Array.GetRandom(this.powerup_types);

        //2.Define the spawn position 
        const position = {
            x: 640 + 32,
            y: Phaser.Math.Between(50,430)
        };

        //3. Instantiate the chosen class and add it to a single group/array
        const powerup = new PowerUpClass(this, position.x, position.y);
        this.powerups.push(powerup);
    }

    // The beautifully simple, polymorphic callback
    collect_powerup(player,powerup){
        //Tell the power-up to do its thing. the scene doesn't care what it is
        powerup.applyEffect(player);
        powerup.destroy();
    }
}