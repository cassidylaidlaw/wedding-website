import { Scene } from "phaser";

export class Game extends Scene {
    constructor() {
        super("Game");
    }

    preload() {
        this.load.setPath("assets");

        this.load.image("background", "bg.png");
        this.load.image("logo", "logo.png");
    }

    create() {
        this.matter.world.setGravity(0, 1); // Set gravity
        this.matter.world.setBounds();

        for (let i = 0; i < 5; i++) {
            const x = Phaser.Math.Between(100, 700);
            const y = Phaser.Math.Between(50, 400);
            const size = Phaser.Math.Between(40, 80);

            const circle = this.add.circle(x, y, size / 2, 0x00ff00);
            this.matter.add.gameObject(circle, {
                restitution: 0.9,
                friction: 0.1,
                frictionAir: 0.02,
            });
        }

        this.matter.add.pointerConstraint({
            length: 1,
            stiffness: 0.6,
        });
    }
}
