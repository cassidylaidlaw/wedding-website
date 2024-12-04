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
    WARDROBE_ZOOMED_OUT,
    WARDROBE_ZOOMED_IN,
    WARDROBE_ZOOMING_IN,
    WARDROBE_ZOOMING_OUT,
} from "../constants";

const ALL_CLOTHING_KEYS = [
    "dress",
    "suit",
    "mario-hat",
    "bunny-ears",
    "cassidy-sunglasses",
    "speedo",
];
// prettier-ignore
const CLOTHING_SCALES: Record<string, number> = {
    "dress": 1.0,
    "suit": 1.0,
    "mario-hat": 0.5,
    "bunny-ears": 0.5,
    "cassidy-sunglasses": 0.5,
    "speedo": 0.5,
};

export class Game extends Scene {
    wind: Phaser.Math.Vector2;

    constructor() {
        super("Game");
    }

    preload() {
        this.load.setPath("/assets/images");

        this.load.image("lauren", "lauren.png");
        this.load.image("cassidy", "cassidy.png");
        this.load.image("chuppah", "chuppah.png");
        this.load.image("chuppah-platform", "chuppah-platform.png");
        this.load.image("chuppah-top", "chuppah-top-unskewed.png");
        this.load.image("wardrobe-door", "wardrobe-door.png");
        this.load.image("banner", "banner.png");
        this.load.image("camera", "camera.png");
        this.load.image("stool", "stool.png");

        ALL_CLOTHING_KEYS.forEach((clothingKey) => {
            this.load.image(clothingKey, `${clothingKey}.png`);
        });
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
            GAME_WIDTH / 2 - 480,
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
            GAME_WIDTH / 2 + 480,
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
        wardrobe.setCollidesWith(0);

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

        wardrobe.setData("zoomState", WARDROBE_ZOOMED_OUT);
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
            if (wardrobe.getData("zoomState") === WARDROBE_ZOOMED_IN) {
                this.zoomOutFromWardrobe(wardrobe);
            } else if (wardrobe.getData("zoomState") === WARDROBE_ZOOMED_OUT) {
                this.zoomInToWardrobe(wardrobe);
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
        if (wardrobe.getData("zoomState") !== WARDROBE_ZOOMED_OUT) return;
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

    zoomInToWardrobe(wardrobe: Phaser.Physics.Matter.Sprite & MatterJS.BodyType) {
        this.cameras.main.pan(wardrobe.x, wardrobe.y - 80, 1000, "Power2");
        this.cameras.main.zoomTo(2.2, 1000, "Power2");
        wardrobe.setData("zoomState", WARDROBE_ZOOMING_IN);
        setTimeout(() => wardrobe.setData("zoomState", WARDROBE_ZOOMED_IN), 1000);
    }

    zoomOutFromWardrobe(wardrobe: Phaser.Physics.Matter.Sprite & MatterJS.BodyType) {
        this.cameras.main.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, "Power2");
        this.cameras.main.zoomTo(1, 500, "Power2");
        wardrobe.setData("zoomState", WARDROBE_ZOOMING_OUT);
        setTimeout(() => wardrobe.setData("zoomState", WARDROBE_ZOOMED_OUT), 500);
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
            const scale = item.getData("fullScale");

            this.children.bringToTop(item);
            item.setDepth(DEPTH_DEFAULT);

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
                        item.setState(CLOTHING_UNATTACHED);
                    },
                });
            } else {
                item.setPosition(wardrobe.x, wardrobe.y);
                item.setScale(scale);
                item.setStatic(false);
                item.setState(CLOTHING_UNATTACHED);
            }
            return true;
        } else {
            return false;
        }
    }

    createClothing(wardrobe: Phaser.Physics.Matter.Sprite & MatterJS.BodyType) {
        ALL_CLOTHING_KEYS.forEach((clothingKey) => {
            const clothingItem = this.matter.add.image(
                200,
                200,
                clothingKey,
                undefined,
            ) as Phaser.Physics.Matter.Sprite & MatterJS.BodyType;
            clothingItem.setScale(CLOTHING_SCALES[clothingKey]);
            clothingItem.setData("fullScale", clothingItem.scale);

            clothingItem.setCollisionCategory(CATEGORY_CLOTHES);
            clothingItem.setCollidesWith(CATEGORY_BARRIERS);
            clothingItem.setState(CLOTHING_UNATTACHED);
            this.addItemToWardrobe(wardrobe, clothingItem);

            clothingItem.setInteractive({ useHandCursor: true });
            clothingItem.on("pointerup", () => {
                if (
                    clothingItem.state === CLOTHING_IN_WARDROBE &&
                    wardrobe.getData("zoomState") === WARDROBE_ZOOMED_IN
                ) {
                    this.removeItemFromWardrobe(wardrobe, clothingItem, true);
                    this.zoomOutFromWardrobe(wardrobe);
                } else if (
                    clothingItem.state === CLOTHING_IN_WARDROBE &&
                    wardrobe.getData("zoomState") === WARDROBE_ZOOMED_OUT
                ) {
                    this.zoomInToWardrobe(wardrobe);
                }
            });
            clothingItem.on("pointerover", () => {
                if (clothingItem.state === CLOTHING_IN_WARDROBE) {
                    this.openWardrobe(wardrobe);
                }

                if (
                    clothingItem.state === CLOTHING_IN_WARDROBE &&
                    [WARDROBE_ZOOMED_IN, WARDROBE_ZOOMING_IN].includes(
                        wardrobe.getData("zoomState"),
                    )
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
                    [WARDROBE_ZOOMED_IN, WARDROBE_ZOOMING_IN].includes(
                        wardrobe.getData("zoomState"),
                    ) &&
                    clothingItem.getData("originalScale") != null
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

                        const gameObjectWorldTransform =
                            new Phaser.GameObjects.Components.TransformMatrix().copyFrom(
                                (
                                    gameObject as Phaser.Physics.Matter.Sprite
                                ).getWorldTransformMatrix(),
                            );
                        const personWorldTransform =
                            new Phaser.GameObjects.Components.TransformMatrix().copyFrom(
                                person.getWorldTransformMatrix(),
                            );
                        const scaleTransform =
                            new Phaser.GameObjects.Components.TransformMatrix(
                                body.scale.x,
                                0,
                                0,
                                body.scale.y,
                                0,
                                0,
                            );
                        scaleTransform.invert();
                        const transform = gameObjectWorldTransform;
                        transform.multiply(scaleTransform);
                        personWorldTransform.invert();
                        transform.multiply(personWorldTransform);
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
        const chuppahPlatform = this.matter.add.image(
            GAME_WIDTH / 2,
            GAME_HEIGHT - 22,
            "chuppah-platform",
            undefined,
            { isStatic: true },
        );
        chuppahPlatform.setCollisionCategory(CATEGORY_OBJECTS);
        chuppahPlatform.setDepth(DEPTH_DEFAULT);

        const chuppah = this.matter.add.image(
            GAME_WIDTH / 2,
            GAME_HEIGHT - 448,
            "chuppah",
            undefined,
            { isStatic: true },
        );
        chuppah.setDepth(DEPTH_FOREGROUND);
        chuppah.setCollisionCategory(CATEGORY_FOREGROUND);
        chuppah.setCollidesWith(0);

        const chuppahTop = this.createRope(
            "chuppah-top",
            new Phaser.Geom.Point(GAME_WIDTH / 2 - 300, GAME_HEIGHT - 765),
            new Phaser.Geom.Point(GAME_WIDTH / 2 + 300, GAME_HEIGHT - 770),
            30,
            5,
            20,
            CATEGORY_OBJECTS,
            CATEGORY_OBJECTS,
            0.8,
        );
        chuppahTop.setDepth(DEPTH_DEFAULT);
    }

    createRope(
        texture: string,
        ropeBegin: Phaser.Geom.Point,
        ropeEnd: Phaser.Geom.Point,
        numPoints: number,
        droopX: number,
        droopY: number,
        collisionCategory: number,
        collidesWith: number,
        segmentLengthMultiplier = 1.0,
    ): Phaser.GameObjects.Rope {
        const rope = this.add.rope(
            0,
            0,
            texture,
            undefined,
            numPoints as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        );

        const segmentLength =
            (segmentLengthMultiplier *
                Phaser.Math.Distance.BetweenPoints(ropeBegin, ropeEnd)) /
            (numPoints - 1);

        const ropePoints: Array<Phaser.Physics.Matter.Sprite & MatterJS.BodyType> = [];
        let prevPoint: MatterJS.BodyType | null = null;
        for (let pointIndex = 0; pointIndex < numPoints; pointIndex++) {
            const ropePointLocation = Phaser.Geom.Point.Interpolate(
                ropeBegin,
                ropeEnd,
                pointIndex / (numPoints - 1),
            );
            ropePointLocation.y +=
                droopY * Math.sin((pointIndex / numPoints) * Math.PI);
            ropePointLocation.x +=
                -droopX * Math.sin((pointIndex / numPoints) * 2 * Math.PI);
            const point = this.matter.add.gameObject(
                this.add.circle(ropePointLocation.x, ropePointLocation.y, 1),
                {
                    isStatic: pointIndex === 0 || pointIndex === numPoints - 1,
                },
            ) as Phaser.Physics.Matter.Sprite & MatterJS.BodyType;
            point.setCollisionCategory(collisionCategory);
            point.setCollidesWith(collidesWith);
            if (prevPoint !== null) {
                this.matter.add.constraint(point, prevPoint, segmentLength, 0);
            }
            ropePoints.push(point);
            prevPoint = point;
        }

        this.matter.world.on("beforeupdate", () => {
            for (let pointIndex = 0; pointIndex < numPoints; pointIndex++) {
                rope.points[pointIndex].x = ropePoints[pointIndex].x;
                rope.points[pointIndex].y = ropePoints[pointIndex].y;

                ropePoints[pointIndex].applyForce(this.wind);
            }
            rope.setDirty();
        });

        return rope;
    }

    createBanner() {
        const bannerRope = this.createRope(
            "banner",
            new Phaser.Geom.Point(GAME_WIDTH / 2 - 500, -80),
            new Phaser.Geom.Point(GAME_WIDTH / 2 + 500, -80),
            30,
            10,
            200,
            CATEGORY_FOREGROUND,
            0,
        );
        bannerRope.setDepth(DEPTH_BANNER);
    }

    createCamera() {
        const stool = this.matter.add.image(
            GAME_WIDTH / 2 - 800,
            GAME_HEIGHT - 75,
            "stool",
            undefined,
            {
                isStatic: true,
            },
        );
        stool.setDepth(DEPTH_BACKGROUND);
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
            GAME_HEIGHT - 168,
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
                y: GAME_HEIGHT - 188,
                duration: 200,
                ease: "Power2",
            });
        });
        camera.on("pointerout", () => {
            this.tweens.add({
                targets: camera,
                y: GAME_HEIGHT - 168,
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
