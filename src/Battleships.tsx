import { useMemo, useState } from 'react';
import cn from 'classnames';
import styles from './Battleships.module.scss';
// {
//     "shipTypes": {
//         "carrier": { "size": 5, "count": 1 },
//         "battleship": { "size": 4, "count": 1 },
//         "cruiser": { "size": 3, "count": 1 },
//         "submarine": { "size": 3, "count": 1 },
//         "destroyer": { "size": 2, "count": 1 }
//     },

//     "layout": [
//         { "ship": "carrier", "positions": [[2,9], [3,9], [4,9], [5,9], [6,9]] },
//         { "ship": "battleship", "positions": [[5,2], [5,3], [5,4], [5,5]] },
//         { "ship": "cruiser", "positions": [[8,1], [8,2], [8,3]] },
//         { "ship": "submarine", "positions": [[3,0], [3,1], [3,2]] },
//         { "ship": "destroyer", "positions": [[0,0], [1,0]] }
//     ]
// }

const cls = cn.bind(styles);

type ShipType =
    | 'carrier'
    | 'battleship'
    | 'cruiser'
    | 'submarine'
    | 'destroyer';

type Position = [number, number];

type BoardSize = { width: number; height: number };

interface Ship {
    ship: ShipType;
    positions: Position[];
}

// could maybe do this as an enum
type CellState = 'miss' | 'hit' | undefined;

interface GameBoard {
    cellState: CellState[][]; // 2d array of cells
    ships: Ship[];
    isGameOver: boolean;
}

const ShipTypes: Record<ShipType, { size: number; count: number }> = {
    carrier: { size: 5, count: 1 },
    battleship: { size: 4, count: 1 },
    cruiser: { size: 3, count: 1 },
    submarine: { size: 3, count: 1 },
    destroyer: { size: 2, count: 1 },
} as const;

const createEmptyBoard = (boardSize: BoardSize): GameBoard => {
    const board: CellState[][] = [];
    for (let i = 0; i < boardSize.height; i++) {
        board.push([]);
        for (let j = 0; j < boardSize.width; j++) {
            board[i].push(undefined);
        }
    }
    const ships = placeAllShips(boardSize);
    return { cellState: board, ships, isGameOver: false };
};

const getInitialRandomPosition = (
    shipSize: number,
    boardSize: BoardSize,
    isHorizontal = true
): Position => {
    const maxX = isHorizontal
        ? boardSize.width - shipSize
        : boardSize.width - 1;
    const maxY = isHorizontal
        ? boardSize.height - 1
        : boardSize.height - shipSize;
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);
    return [x, y];
};

const getShipPositions = (
    shipSize: number,
    boardSize: BoardSize
): Position[] => {
    const isHorizontal = Math.random() < 0.5;
    const [x, y] = getInitialRandomPosition(shipSize, boardSize, isHorizontal);
    const positions: Position[] = [];
    for (let i = 0; i < shipSize; i++) {
        positions.push(isHorizontal ? [x + i, y] : [x, y + i]);
    }
    return positions;
};

const placeAllShips = (boardSize: BoardSize): Ship[] => {
    const ships: Ship[] = [];
    for (const [type, shipInfo] of Object.entries(ShipTypes)) {
        let positions: Position[];
        do {
            positions = getShipPositions(shipInfo.size, boardSize);
        } while (
            // this is expensive but it allows us to randomly generate the board
            ships.some((ship) =>
                ship.positions.some((p) =>
                    positions.some((q) => q[0] === p[0] && q[1] === p[1])
                )
            )
        );
        ships.push({
            ship: type as ShipType,
            positions,
        });
    }
    return ships;
};

// bit expensive but easier mentally than imperative approach, also reactive

const isDead = (ship: Ship, board: CellState[][]): boolean => {
    return ship.positions.every(
        (position) => board[position[1]][position[0]] === 'hit'
    );
};

const gameOver = (board: GameBoard): boolean => {
    return board.ships.every((ship) => isDead(ship, board.cellState));
};

const shipNumberOfHits = (
    board: CellState[][],
    ship: Ship | undefined
): number => {
    if (!ship) {
        return 0;
    }
    return ship.positions.filter(
        (position) => board[position[1]][position[0]] === 'hit'
    ).length;
};

const launchMissile = (board: GameBoard, x: number, y: number): GameBoard => {
    // we're not going to validate hit is within  bounds or that it's not already in hit list
    // we'll do this in the game interface

    const hitShip = board.ships.find((ship) =>
        ship.positions.some(
            (position) => position[0] === x && position[1] === y
        )
    );

    if (hitShip) {
        board.cellState = board.cellState.map((row, i) =>
            row.map((cell, j) => {
                if (i === y && j === x) {
                    return 'hit';
                }
                return cell;
            })
        );
    } else {
        board.cellState = board.cellState.map((row, i) =>
            row.map((cell, j) => {
                if (i === y && j === x) {
                    return 'miss';
                }
                return cell;
            })
        );
    }

    const isGameOver = gameOver(board);
    return { ...board, isGameOver };
};

const BoardSize = { width: 10, height: 10 };

const getDynamicImageUrl = (imageName: string): string => {
    return new URL('./assets/' + imageName + '.png', import.meta.url).href;
};

interface IRenderHitsProps {
    cellState: CellState[][];
    ship?: Ship;
}

export const RenderHits: React.FC<IRenderHitsProps> = ({ cellState, ship }) => {
    const hits = useMemo(
        () => shipNumberOfHits(cellState, ship),
        [cellState, ship]
    );

    return (
        <div>
            {Array.from({ length: hits }, (_, i) => (
                <img key={i} src={getDynamicImageUrl('hit_small')} />
            ))}
        </div>
    );
};

export const BoardPage = () => {
    const [board, setBoard] = useState<GameBoard>(createEmptyBoard(BoardSize));

    const onCellClick = (x: number, y: number, cell?: string) => () => {
        if (cell === undefined && !board.isGameOver) {
            const newBoard = launchMissile(board, x, y);
            setBoard(newBoard);
        }
    };

    const resetGameState = () => {
        setBoard(createEmptyBoard(BoardSize));
    };

    return (
        <div>
            <dialog className={cls(styles.dialog)} open={board.isGameOver}>
                <button onClick={resetGameState}>
                    Game Over, click here to restart
                </button>
            </dialog>
            <div
                className={cls({
                    [styles.overlay]: board.isGameOver,
                })}
            />
            <div className={cls(styles.boardPage)}>
                <BoardStatus board={board} />
                <div className={cls(styles.board)}>
                    {board.cellState.map((row, y) => (
                        <div className={cls(styles.row)} key={y}>
                            {row.map((cell, x) => (
                                <div
                                    key={x}
                                    onClick={onCellClick(x, y, cell)}
                                    className={cls(styles.cell, {
                                        [styles.miss]: cell === 'miss',
                                        [styles.hit]: cell === 'hit',
                                        [styles.gameOver]: board.isGameOver,
                                    })}
                                ></div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
export const BoardStatus: React.FC<{ board: GameBoard }> = ({ board }) => {
    return (
        <div className={cls(styles.status)}>
            {Object.entries(ShipTypes)
                .sort(([_, shipInfo]) => -shipInfo.size)
                .map(([ship]) => (
                    <div
                        key={ship}
                        className={cls(styles.shipStatus, {
                            [styles.deadShip]: isDead(
                                board.ships.find((s) => s.ship === ship)!,
                                board.cellState
                            ),
                        })}
                    >
                        <img src={getDynamicImageUrl(ship)} />
                        <RenderHits
                            cellState={board.cellState}
                            ship={board.ships.find((s) => s.ship === ship)}
                        />
                    </div>
                ))}
        </div>
    );
};
