import { Game as MainGame } from "./scenes/Game";
import { AUTO, Game, Scale, Types } from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, ONLY_BANNER } from "./constants";

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
    type: AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: "game-container",
    backgroundColor: "#ffffff",
    transparent: true,
    scale: {
        mode: ONLY_BANNER ? Scale.HEIGHT_CONTROLS_WIDTH : Scale.FIT,
        autoCenter: Scale.CENTER_HORIZONTALLY,
        expandParent: false,
    },
    physics: {
        default: "matter",
        matter: {
            // debug: {
            //     showCollisions: true,
            // },
        },
    },
    input: {
        mouse: { preventDefaultWheel: false },
    },
    preserveDrawingBuffer: true,
    scene: [MainGame],
};

export default new Game(config);
