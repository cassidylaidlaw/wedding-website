import { Scene } from "phaser";
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    CATEGORY_OBJECTS,
    CATEGORY_CLOTHES,
    CATEGORY_FOREGROUND,
    CLOTHING_UNATTACHED,
    CLOTHING_ATTACHED,
    DEPTH_CONTAINER,
    DEPTH_CONTAINER_DOOR,
    DEPTH_DEFAULT,
    DEPTH_FOREGROUND,
    DEPTH_IN_CONTAINER,
    CLOTHING_IN_WARDROBE,
    CATEGORY_BARRIERS,
    WARDROBE_CLOSED,
    WARDROBE_OPEN,
    WARDROBE_OPENING,
    WARDROBE_CLOSING,
    DEPTH_BANNER,
    ONLY_BANNER,
    DEPTH_FLASH,
    DEPTH_BACKGROUND,
} from "../constants";

export class Game extends Scene {
    wind: Phaser.Math.Vector2;

    constructor() {
        super("Game");
    }

    preload() {
        this.load.setPath("/assets/images");

        this.load.image("lauren", "lauren.png");
        this.load.image("cassidy", "cassidy.png");
        this.load.image("dress", "dress.png");
        this.load.image("speedo", "speedo.png");
        this.load.image("suit", "suit.png");
        this.load.image("wardrobe-door", "wardrobe-door.png");
        this.load.image("banner", "banner.png");
        this.load.image("camera", "camera.png");
    }

    create() {
        this.wind = new Phaser.Math.Vector2(0, 0);

        this.matter.world.setGravity(0, 3);

        this.createBanner();
        if (ONLY_BANNER) return;

        this.matter.world.setBounds(
            -100,
            -10000,
            GAME_WIDTH + 200,
            GAME_HEIGHT + 10000,
            1000,
            true,
            true,
            false,
            true,
        );

        const wardrobe = this.createWardrobe();
        this.createClothing(wardrobe);
        const people = this.createPeople();
        this.createCamera();

        this.createChuppah();

        this.setupClothingDragging(wardrobe, people);

        this.matter.add.pointerConstraint({
            length: 1,
            stiffness: 0.6,
            angularStiffness: 0.3,
        });
    }

    createPeople(): Array<Phaser.Physics.Matter.Sprite & MatterJS.BodyType> {
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
        ) as Phaser.Physics.Matter.Sprite & MatterJS.BodyType;
        lauren.setCollisionCategory(CATEGORY_OBJECTS);
        lauren.setCollidesWith(CATEGORY_BARRIERS | CATEGORY_OBJECTS);

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
        ) as Phaser.Physics.Matter.Sprite & MatterJS.BodyType;
        cassidy.setCollisionCategory(CATEGORY_OBJECTS);
        cassidy.setCollidesWith(CATEGORY_BARRIERS | CATEGORY_OBJECTS);

        return [lauren, cassidy];
    }

    createWardrobe() {
        const wardrobeRectangle = this.add.rectangle(
            GAME_WIDTH - 180,
            GAME_HEIGHT - 300,
            300,
            600,
            0x5c4033,
        );
        wardrobeRectangle.setDepth(DEPTH_CONTAINER);
        const wardrobe = this.matter.add.gameObject(wardrobeRectangle, {
            isStatic: true,
        }) as Phaser.Physics.Matter.Sprite & MatterJS.BodyType;
        wardrobe.setCollisionCategory(CATEGORY_FOREGROUND);
        wardrobe.setCollidesWith(CATEGORY_FOREGROUND);

        wardrobe.setData("slots", Array(6).fill(null));
        wardrobe.setData("slotsPerRow", 2);

        const doors: Array<Phaser.GameObjects.Mesh> = [];
        for (let doorIndex = 0; doorIndex < 2; doorIndex++) {
            const door = this.add.mesh(
                wardrobe.x + 120 * (doorIndex * 2 - 1),
                GAME_HEIGHT - 370,
                "wardrobe-door",
            );
            door.addVertices(
                [0, 1.6, 1 - doorIndex * 2, 1.6, 0, -1.6, 1 - doorIndex * 2, -1.6],
                [1, 0, 0, 0, 1, 1, 0, 1],
                [0, 2, 1, 2, 3, 1, 0, 1, 2, 2, 1, 3],
            );
            door.panZ(20);
            door.setDepth(DEPTH_CONTAINER_DOOR);
            doors.push(door);
        }

        wardrobe.setData("zoomedIn", false);
        wardrobe.setData("doors", doors);
        wardrobe.setState(WARDROBE_CLOSED);

        wardrobe.setInteractive({ useHandCursor: true });
        wardrobe.on("pointerover", () => {
            this.openWardrobe(wardrobe);
        });
        wardrobe.on("pointerout", () => {
            this.closeWardrobe(wardrobe);
        });
        wardrobe.on("pointerup", () => {
            if (wardrobe.getData("zoomedIn")) {
                this.zoomOutFromWardrobe(wardrobe);
            } else {
                this.cameras.main.pan(wardrobe.x, wardrobe.y - 80, 1000, "Power2");
                this.cameras.main.zoomTo(2.2, 1000, "Power2");
                wardrobe.setData("zoomedIn", true);
            }
        });

        return wardrobe;
    }

    openWardrobe(wardrobe: Phaser.Physics.Matter.Sprite & MatterJS.BodyType) {
        const doors = wardrobe.getData("doors") as Array<Phaser.GameObjects.Mesh>;
        if (wardrobe.state === WARDROBE_OPEN || wardrobe.state === WARDROBE_OPENING)
            return;
        wardrobe.setState(WARDROBE_OPENING);
        this.tweens.addCounter({
            from: doors[0].modelRotation.y / -2,
            to: 1,
            duration: 1000,
            ease: "Power2",
            onUpdate: (tween) => {
                doors.forEach((door, doorIndex) => {
                    door.modelRotation.y = (1 - 2 * doorIndex) * tween.getValue() * -2;
                });
            },
            onComplete: () => {
                wardrobe.setState(WARDROBE_OPEN);
            },
        });
    }

    closeWardrobe(wardrobe: Phaser.Physics.Matter.Sprite & MatterJS.BodyType) {
        if (wardrobe.getData("zoomedIn")) return;
        const doors = wardrobe.getData("doors") as Array<Phaser.GameObjects.Mesh>;
        if (wardrobe.state === WARDROBE_CLOSED || wardrobe.state === WARDROBE_CLOSING)
            return;
        wardrobe.setState(WARDROBE_CLOSING);
        this.tweens.addCounter({
            from: doors[0].modelRotation.y / -2,
            to: 0,
            duration: 1000,
            ease: "Power2",
            onUpdate: (tween) => {
                doors.forEach((door, doorIndex) => {
                    door.modelRotation.y = (1 - 2 * doorIndex) * tween.getValue() * -2;
                });
            },
            onComplete: () => {
                wardrobe.setState(WARDROBE_CLOSED);
            },
        });
    }

    zoomOutFromWardrobe(wardrobe: Phaser.Physics.Matter.Sprite & MatterJS.BodyType) {
        this.cameras.main.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1000, "Power2");
        this.cameras.main.zoomTo(1, 1000, "Power2");
        wardrobe.setData("zoomedIn", false);
    }

    addItemToWardrobe(
        wardrobe: Phaser.Physics.Matter.Sprite & MatterJS.BodyType,
        item: Phaser.Physics.Matter.Sprite & MatterJS.BodyType,
        animate?: boolean,
    ): boolean {
        const slots = wardrobe.getData("slots") as Array<
            (Phaser.Physics.Matter.Sprite & MatterJS.BodyType) | null
        >;
        const slotIndex = slots.findIndex((slot) => slot === null);
        if (slotIndex !== -1) {
            slots[slotIndex] = item;

            const slotsPerRow = wardrobe.getData("slotsPerRow");
            const row = Math.floor(slotIndex / wardrobe.getData("slotsPerRow"));
            const column = slotIndex % wardrobe.getData("slotsPerRow");
            const slotSize = 240 / slotsPerRow;

            const scale = (0.7 * slotSize) / Math.max(item.width, item.height);
            const x = wardrobe.x - 120 + slotSize * (column + 0.5);
            const y = wardrobe.y - wardrobe.height / 2 + 40 + slotSize * (row + 0.5);

            item.setStatic(true);
            item.setState(CLOTHING_IN_WARDROBE);

            if (animate) {
                this.tweens.add({
                    targets: item,
                    x,
                    y,
                    scaleX: scale,
                    scaleY: scale,
                    duration: 500,
                    ease: "Power2",
                    onComplete: () => {
                        item.setDepth(DEPTH_IN_CONTAINER);
                    },
                });
            } else {
                item.setPosition(
                    wardrobe.x - 120 + slotSize * (column + 0.5),
                    wardrobe.y - wardrobe.height / 2 + 40 + slotSize * (row + 0.5),
                );
                item.setScale(scale);
                item.setDepth(DEPTH_IN_CONTAINER);
            }
            return true;
        } else {
            return false;
        }
    }

    removeItemFromWardrobe(
        wardrobe: Phaser.Physics.Matter.Sprite & MatterJS.BodyType,
        item: Phaser.Physics.Matter.Sprite & MatterJS.BodyType,
        animate?: boolean,
    ): boolean {
        const slots = wardrobe.getData("slots") as Array<
            (Phaser.Physics.Matter.Sprite & MatterJS.BodyType) | null
        >;
        const slotIndex = slots.findIndex((slot) => slot === item);
        if (slotIndex !== -1) {
            slots[slotIndex] = null;

            const x = wardrobe.x;
            const y = wardrobe.y;
            const scale = 1;

            this.children.bringToTop(item);
            item.setDepth(DEPTH_DEFAULT);
            item.setState(CLOTHING_UNATTACHED);

            if (animate) {
                this.tweens.add({
                    targets: item,
                    x,
                    y,
                    scaleX: scale,
                    scaleY: scale,
                    duration: 500,
                    ease: "Power2",
                    onComplete: () => {
                        item.setStatic(false);
                        this.closeWardrobe(wardrobe);
                    },
                });
            } else {
                item.setPosition(wardrobe.x, wardrobe.y);
                item.setScale(scale);
                item.setStatic(false);
            }
            return true;
        } else {
            return false;
        }
    }

    createClothing(wardrobe: Phaser.Physics.Matter.Sprite & MatterJS.BodyType) {
        ["dress", "suit", "speedo"].forEach((clothingKey) => {
            const clothingItem = this.matter.add.image(
                200,
                200,
                clothingKey,
                undefined,
            ) as Phaser.Physics.Matter.Sprite & MatterJS.BodyType;
            clothingItem.setCollisionCategory(CATEGORY_CLOTHES);
            clothingItem.setCollidesWith(CATEGORY_BARRIERS);
            clothingItem.setState(CLOTHING_UNATTACHED);
            this.addItemToWardrobe(wardrobe, clothingItem);

            clothingItem.setInteractive({ useHandCursor: true });
            clothingItem.on("pointerdown", () => {
                if (
                    clothingItem.state === CLOTHING_IN_WARDROBE &&
                    wardrobe.getData("zoomedIn")
                ) {
                    this.removeItemFromWardrobe(wardrobe, clothingItem, true);
                    this.zoomOutFromWardrobe(wardrobe);
                }
            });
            clothingItem.on("pointerover", () => {
                if (
                    clothingItem.state === CLOTHING_IN_WARDROBE &&
                    wardrobe.getData("zoomedIn")
                ) {
                    clothingItem.setData("originalScale", clothingItem.scale);
                    this.tweens.add({
                        targets: clothingItem,
                        scaleX: clothingItem.scale * 1.2,
                        scaleY: clothingItem.scale * 1.2,
                        duration: 200,
                        ease: "Power2",
                    });
                }
            });
            clothingItem.on("pointerout", () => {
                if (
                    clothingItem.state === CLOTHING_IN_WARDROBE &&
                    wardrobe.getData("zoomedIn")
                ) {
                    this.tweens.add({
                        targets: clothingItem,
                        scaleX: clothingItem.getData("originalScale"),
                        scaleY: clothingItem.getData("originalScale"),
                        duration: 200,
                        ease: "Power2",
                    });
                }
            });
        });
    }

    setupClothingDragging(
        wardrobe: Phaser.Physics.Matter.Sprite & MatterJS.BodyType,
        people: Array<Phaser.Physics.Matter.Sprite & MatterJS.BodyType>,
    ) {
        let clothingBeingDragged: Phaser.GameObjects.GameObject | null = null;
        this.matter.world.on("dragstart", (body: MatterJS.BodyType) => {
            const gameObject = body.gameObject;
            if (gameObject == null) return;
            if (gameObject.state === CLOTHING_ATTACHED) {
                gameObject.setState(CLOTHING_UNATTACHED);
                this.matter.world.getAllConstraints().forEach((constraint) => {
                    const gameObjectB = constraint.bodyB?.gameObject;
                    if (
                        constraint.bodyA === body &&
                        gameObjectB != null &&
                        people.map((person) => person === gameObjectB).includes(true)
                    ) {
                        this.matter.world.remove(constraint);
                    }
                });
            }
            if (gameObject.state === CLOTHING_UNATTACHED) {
                this.children.bringToTop(gameObject);
                (gameObject as Phaser.GameObjects.Sprite).setDepth(DEPTH_DEFAULT);
                clothingBeingDragged = gameObject;
            }
        });

        this.matter.world.on("dragend", (body: MatterJS.BodyType) => {
            const gameObject = body.gameObject;
            if (gameObject != null && gameObject.state === CLOTHING_UNATTACHED) {
                clothingBeingDragged = null;
                const overlapsWithPeople = people.map((person) => {
                    if (person.getBounds().contains(body.position.x, body.position.y)) {
                        gameObject.setState(CLOTHING_ATTACHED);

                        (gameObject as Phaser.Physics.Matter.Sprite).setVelocity(0, 0);
                        (gameObject as Phaser.Physics.Matter.Sprite).setAngularVelocity(
                            0,
                        );

                        const transform =
                            new Phaser.GameObjects.Components.TransformMatrix().copyFrom(
                                (
                                    gameObject as Phaser.Physics.Matter.Sprite
                                ).getWorldTransformMatrix(),
                            );
                        transform.multiply(
                            new Phaser.GameObjects.Components.TransformMatrix()
                                .copyFrom(person.getWorldTransformMatrix())
                                .invert(),
                        );
                        const relativeUpper = transform.transformPoint(0, -30);
                        const relativeLower = transform.transformPoint(0, 30);
                        // Add two constraints to prevent rotation.
                        this.matter.add.constraint(body, person, 0, 1.0, {
                            pointA: { x: 0, y: -30 },
                            pointB: { x: relativeUpper.x, y: relativeUpper.y },
                        });
                        this.matter.add.constraint(body, person, 0, 1.0, {
                            pointA: { x: 0, y: 30 },
                            pointB: { x: relativeLower.x, y: relativeLower.y },
                        });
                        return true;
                    } else {
                        return false;
                    }
                });
                if (!overlapsWithPeople.includes(true)) {
                    if (
                        wardrobe.getBounds().contains(body.position.x, body.position.y)
                    ) {
                        this.addItemToWardrobe(
                            wardrobe,
                            gameObject as Phaser.Physics.Matter.Sprite &
                                MatterJS.BodyType,
                            true,
                        );
                    }
                }
            }
        });

        this.matter.world.on("afterupdate", () => {
            if (clothingBeingDragged !== null) {
                if (
                    wardrobe
                        .getBounds()
                        .contains(
                            this.game.input.activePointer.x,
                            this.game.input.activePointer.y,
                        )
                ) {
                    this.openWardrobe(wardrobe);
                } else {
                    this.closeWardrobe(wardrobe);
                }
            }
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
            point.setCollisionCategory(CATEGORY_OBJECTS);
            point.setCollidesWith(CATEGORY_BARRIERS | CATEGORY_OBJECTS);
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
                point.applyForce(this.wind);
            });
            graphics.strokePath();
        });
    }

    createChuppah() {
        const poles: Array<Phaser.Physics.Matter.Sprite & MatterJS.BodyType> = [];
        for (let poleIndex = 0; poleIndex < 2; poleIndex++) {
            const poleRectangle = this.add.rectangle(
                GAME_WIDTH / 2 - 300 + 600 * poleIndex,
                GAME_HEIGHT - 350,
                30,
                700,
                0x5c4033,
            );
            poleRectangle.setDepth(DEPTH_FOREGROUND);
            const pole = this.matter.add.gameObject(poleRectangle, {
                isStatic: true,
            }) as Phaser.Physics.Matter.Sprite & MatterJS.BodyType;
            poles.push(pole);
            pole.setCollisionCategory(CATEGORY_FOREGROUND);
            pole.setCollidesWith(0);
        }

        this.createChuppahLine(poles, 30, 12);
        this.createChuppahLine(poles, 30, 16);
    }

    createBanner() {
        const numPoints = 30;
        const bannerRope = this.add.rope(
            0,
            0,
            "banner",
            undefined,
            numPoints as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        );
        bannerRope.setDepth(DEPTH_BANNER);

        const ropeBegin = new Phaser.Geom.Point(GAME_WIDTH / 2 - 500, -50);
        const ropeEnd = new Phaser.Geom.Point(GAME_WIDTH / 2 + 500, -50);
        const segmentLength =
            (1.0 * Phaser.Math.Distance.BetweenPoints(ropeBegin, ropeEnd)) /
            (numPoints - 1);

        const ropePoints: Array<Phaser.Physics.Matter.Sprite & MatterJS.BodyType> = [];
        let prevPoint: MatterJS.BodyType | null = null;
        for (let pointIndex = 0; pointIndex < numPoints; pointIndex++) {
            const ropePointLocation = Phaser.Geom.Point.Interpolate(
                ropeBegin,
                ropeEnd,
                pointIndex / (numPoints - 1),
            );
            ropePointLocation.y += 200 * Math.sin((pointIndex / numPoints) * Math.PI);
            ropePointLocation.x +=
                -10 * Math.sin((pointIndex / numPoints) * 2 * Math.PI);
            const point = this.matter.add.gameObject(
                this.add.circle(ropePointLocation.x, ropePointLocation.y, 1),
                {
                    isStatic: pointIndex === 0 || pointIndex === numPoints - 1,
                },
            ) as Phaser.Physics.Matter.Sprite & MatterJS.BodyType;
            point.setCollisionCategory(CATEGORY_FOREGROUND);
            point.setCollidesWith(0);
            if (prevPoint !== null) {
                this.matter.add.constraint(point, prevPoint, segmentLength, 0);
            }
            ropePoints.push(point);
            prevPoint = point;
        }
        this.matter.world.on("beforeupdate", () => {
            for (let pointIndex = 0; pointIndex < numPoints; pointIndex++) {
                bannerRope.points[pointIndex].x = ropePoints[pointIndex].x;
                bannerRope.points[pointIndex].y = ropePoints[pointIndex].y;

                ropePoints[pointIndex].applyForce(this.wind);
            }
            bannerRope.setDirty();
        });
    }

    createCamera() {
        const cameraTable = this.add.rectangle(
            GAME_WIDTH / 2 - 800,
            GAME_HEIGHT - 30,
            120,
            70,
            0x5c4033,
        );
        cameraTable.setDepth(DEPTH_BACKGROUND);
        const cameraFlash = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            0xffffff,
        );
        cameraFlash.setAlpha(0);
        cameraFlash.setDepth(DEPTH_FLASH);
        const camera = this.matter.add.image(
            GAME_WIDTH / 2 - 800,
            GAME_HEIGHT - 95,
            "camera",
            undefined,
            {
                isStatic: true,
            },
        ) as Phaser.Physics.Matter.Sprite & MatterJS.BodyType;
        camera.setDepth(DEPTH_BACKGROUND);
        camera.setInteractive({ useHandCursor: true });
        camera.on("pointerover", () => {
            this.tweens.add({
                targets: camera,
                y: GAME_HEIGHT - 115,
                duration: 200,
                ease: "Power2",
            });
        });
        camera.on("pointerout", () => {
            this.tweens.add({
                targets: camera,
                y: GAME_HEIGHT - 95,
                duration: 200,
                ease: "Power2",
            });
        });
        camera.on("pointerup", () => {
            const takePicture = confirm(
                "Send a picture of your creation to the bride and groom?",
            );
            if (takePicture) {
                const canvas = document.querySelector(
                    "#game-container canvas",
                ) as HTMLCanvasElement;
                const dataURL = canvas.toDataURL("image/png");

                fetch("https://cassidylaidlaw.com/wedding-upload.php", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams({ image_data_url: dataURL }),
                });

                cameraFlash.setAlpha(1);
                this.tweens.add({
                    targets: cameraFlash,
                    alpha: 0,
                    delay: 300,
                    duration: 2000,
                    ease: "Quad.easeOut",
                });
            }
        });
    }

    update() {
        this.updateWind();
    }

    updateWind() {
        if (Math.random() < 0.03) {
            this.wind = this.wind
                .add(
                    new Phaser.Math.Vector2(
                        Phaser.Math.FloatBetween(-1e-6, 1e-6),
                        Phaser.Math.FloatBetween(-1e-6, 1e-6),
                    ),
                )
                .scale(0.8);
        }
        // this.wind = this.wind.add(
        //     new Phaser.Math.Vector2(
        //         Phaser.Math.FloatBetween(-1e-7, 1e-7),
        //         Phaser.Math.FloatBetween(-1e-7, 1e-7),
        //     ),
        // ).scale(0.995);
        // if (Math.random() < 0.1) { alert(`${this.wind.x} ${this.wind.y}`); }
    }
}
