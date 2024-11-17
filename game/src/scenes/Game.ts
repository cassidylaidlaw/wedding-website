import { Scene } from "phaser";
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    CATEGORY_OBJECTS,
    CATEGORY_FOREGROUND,
} from "../constants";

export class Game extends Scene {
    constructor() {
        super("Game");
    }

    preload() {
        this.load.setPath("assets");

        this.load.image("lauren", "lauren.png");
        this.load.image("cassidy", "cassidy.png");
    }

    create() {
        this.matter.world.setGravity(0, 3); // Set gravity
        this.matter.world.setBounds();

        const lauren = this.matter.add.image(
            GAME_WIDTH / 2 - 440,
            400,
            "lauren",
            undefined,
            {
                restitution: 0.5,
                friction: 0.1,
                frictionAir: 0.02,
            },
        );
        lauren.setCollisionCategory(CATEGORY_OBJECTS);
        lauren.setCollidesWith(CATEGORY_OBJECTS);

        const cassidy = this.matter.add.image(
            GAME_WIDTH / 2 + 440,
            400,
            "cassidy",
            undefined,
            {
                restitution: 0.5,
                friction: 0.1,
                frictionAir: 0.02,
            },
        );
        cassidy.setCollisionCategory(CATEGORY_OBJECTS);
        cassidy.setCollidesWith([CATEGORY_OBJECTS]);

        this.createChuppah();

        this.matter.add.pointerConstraint({
            length: 1,
            stiffness: 0.6,
            angularStiffness: 0.3,
        });
    }

    createChuppahLine(
        poles: Array<Phaser.Physics.Matter.Sprite & MatterJS.BodyType>,
        numSegments: number,
        segmentLength: number,
    ) {
        const leftPoleX = poles[0].x,
            rightPoleX = poles[1].x;
        const poleTop = poles[0].y - poles[0].displayHeight / 2;
        const segmentDistance = (rightPoleX - leftPoleX) / numSegments;

        const points: Array<Phaser.Physics.Matter.Sprite & MatterJS.BodyType> = [];
        let prevPoint: MatterJS.BodyType | null = null;
        for (let segmentIndex = 0; segmentIndex < numSegments + 1; segmentIndex++) {
            const point = this.matter.add.gameObject(
                this.add.circle(
                    leftPoleX + (segmentIndex + 0.5) * segmentDistance,
                    poleTop,
                    1,
                ),
                {},
            ) as Phaser.Physics.Matter.Sprite & MatterJS.BodyType;
            if (prevPoint !== null) {
                this.matter.add.constraint(point, prevPoint, segmentLength, 0);
            }
            points.push(point);
            prevPoint = point;
        }
        this.matter.add.constraint(points[0], poles[0], 0, 0, {
            pointB: { x: 0, y: -poles[1].displayHeight / 2 },
        });
        this.matter.add.constraint(points[numSegments], poles[1], 0, 0, {
            pointB: { x: 0, y: -poles[1].displayHeight / 2 },
        });

        const graphics = this.add.graphics({
            lineStyle: { width: 2, color: 0x000000 },
        });
        this.matter.world.on("afterupdate", () => {
            graphics.clear();
            graphics.beginPath();
            graphics.moveTo(points[0].x, points[0].y);
            points.forEach((point) => {
                graphics.lineTo(point.x, point.y);
            });
            graphics.strokePath();
        });
    }

    createChuppah() {
        const poles: Array<Phaser.Physics.Matter.Sprite & MatterJS.BodyType> = [];
        for (let poleIndex = 0; poleIndex < 2; poleIndex++) {
            const pole = this.add.rectangle(
                GAME_WIDTH / 2 - 300 + 600 * poleIndex,
                GAME_HEIGHT - 350,
                30,
                700,
                0x5c4033,
            );
            poles.push(
                this.matter.add.gameObject(pole, {
                    mass: 10,
                    friction: 1,
                    isStatic: true,
                    collisionFilter: {
                        category: CATEGORY_FOREGROUND,
                        collidesWith: 0,
                        group: 0,
                    },
                }) as Phaser.Physics.Matter.Sprite & MatterJS.BodyType,
            );
        }

        this.createChuppahLine(poles, 30, 12);
        this.createChuppahLine(poles, 30, 16);
    }
}
