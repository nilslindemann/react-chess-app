import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

const App = () => {
    const [game, setGame] = useState(new Chess());
    const onDrop = (sourceSquare, targetSquare) => {
        const gameCopy = new Chess(game.fen());
        try {
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q',
            });
            if (move === null) {
                return false;
            }
            setGame(gameCopy);
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    };
    return (
        <div>
            <h1>Chess Game</h1>
            <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                boardWidth={500}
            />
        </div>
    );
};

export default App;
