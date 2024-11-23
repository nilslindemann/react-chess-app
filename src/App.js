import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

const App = () => {
    const [game, setGame] = useState(new Chess());
    const [stockfish, setStockfish] = useState(null);
    const [bestMove, setBestMove] = useState('');
    const [evaluation, setEvaluation] = useState('');
    useEffect(() => {
        const stockfishWorker = new Worker('/js/stockfish-16.1-lite-single.js');
        setStockfish(stockfishWorker);
        return () => {
            stockfishWorker.terminate();
        };
    }, []);
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
            if (stockfish) {
                stockfish.postMessage(`position fen ${gameCopy.fen()}`);
                stockfish.postMessage('go depth 15');
                stockfish.onmessage = (event) => {
                    const { bestMove, evaluation } = getEvaluation(event.data, game.turn());
                    if (bestMove) setBestMove(bestMove);
                    if (evaluation) setEvaluation(evaluation);
                };
            }
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    };
    return (
        <div>
            <h1>Chess Game with Stockfish</h1>
            <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                boardWidth={500}
            />
            <div>
                <h3>Best Move: {bestMove || 'Calculating...'}</h3>
                <h3>Evaluation: {evaluation || 'Evaluating...'}</h3>
            </div>
        </div>
    );
};

const getEvaluation = (message, turn) => {
    let result = { bestMove: '', evaluation: '' };
    if (message.startsWith('bestmove')) {
        result.bestMove = message.split(' ')[1];
    }
    if (message.includes('info') && message.includes('score')) {
        const scoreParts = message.split(' ');
        const scoreIndex = scoreParts.indexOf('score') + 2;
        if (scoreParts[scoreIndex - 1] === 'cp') {
            let score = parseInt(scoreParts[scoreIndex], 10);
            if (turn !== 'b') {
                score = -score;
            }
            result.evaluation = `${score / 100}`;
        } else if (scoreParts[scoreIndex - 1] === 'mate') {
            const mateIn = parseInt(scoreParts[scoreIndex], 10);
            result.evaluation = `Mate in ${Math.abs(mateIn)}`;
        }
    }
    return result;
};

export default App;
