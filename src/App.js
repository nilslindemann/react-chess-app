import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

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
            result.evaluation = score / 100;
        } else if (scoreParts[scoreIndex - 1] === 'mate') {
            const mateIn = parseInt(scoreParts[scoreIndex], 10);
            result.evaluation = `Mate in ${Math.abs(mateIn)}`;
        }
    }
    return result;
};

const customPieces = (() => {
    const imageType = 'png';
    const pieceFamily = 'Minerva';
    const piecePath = (pieceName) => `${process.env.PUBLIC_URL}/img/pieces/${pieceFamily}/${pieceName}.${imageType}`;
    return {
        wP: ({ squareWidth }) => (
            <img
                src={piecePath('wP')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='White Pawn'
            />
        ),
        wN: ({ squareWidth }) => (
            <img
                src={piecePath('wN')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='White Knight'
            />
        ),
        wB: ({ squareWidth }) => (
            <img
                src={piecePath('wB')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='White Bishop'
            />
        ),
        wR: ({ squareWidth }) => (
            <img
                src={piecePath('wR')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='White Rook'
            />
        ),
        wQ: ({ squareWidth }) => (
            <img
                src={piecePath('wQ')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='White Queen'
            />
        ),
        wK: ({ squareWidth }) => (
            <img
                src={piecePath('wK')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='White King'
            />
        ),
        bP: ({ squareWidth }) => (
            <img
                src={piecePath('bP')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='Black Pawn'
            />
        ),
        bN: ({ squareWidth }) => (
            <img
                src={piecePath('bN')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='Black Knight'
            />
        ),
        bB: ({ squareWidth }) => (
            <img
                src={piecePath('bB')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='Black Bishop'
            />
        ),
        bR: ({ squareWidth }) => (
            <img
                src={piecePath('bR')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='Black Rook'
            />
        ),
        bQ: ({ squareWidth }) => (
            <img
                src={piecePath('bQ')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='Black Queen'
            />
        ),
        bK: ({ squareWidth }) => (
            <img
                src={piecePath('bK')}
                style={{ width: squareWidth, height: squareWidth }}
                alt='Black King'
            />
        ),
    };
})();

const lightSquareStyle = {
    backgroundColor: '#FFFFFF',
    backgroundImage: 'repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.1) 0, rgba(0, 0, 0, 0.1) 2px, transparent 2px, transparent 4px)',
};

const darkSquareStyle = {
    backgroundColor: '#CCCCCC',
    backgroundImage: 'repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.1) 0, rgba(0, 0, 0, 0.1) 2px, transparent 2px, transparent 4px)',
};

const App = () => {
    const [game, setGame] = useState(new Chess());
    const [stockfish, setStockfish] = useState(null);
    const [bestMove, setBestMove] = useState('');
    const [evaluation, setEvaluation] = useState('');
    const [bestMoveArrow, setBestMoveArrow] = useState([]);
    const arrowColor = 'rgba(0, 0, 255, 0.6)';
    const [fromSquare, setFromSquare] = useState(null);
    const [toSquare, setToSquare] = useState(null);

    useEffect(() => {
        const stockfishWorker = new Worker(`${process.env.PUBLIC_URL}/js/stockfish-16.1-lite-single.js`);
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
            setFromSquare(sourceSquare);
            setToSquare(targetSquare);
            if (stockfish) {
                stockfish.postMessage(`position fen ${gameCopy.fen()}`);
                stockfish.postMessage('go depth 15');
                stockfish.onmessage = (event) => {
                    const { bestMove, evaluation } = getEvaluation(event.data, game.turn());
                    if (bestMove) {
                        setBestMove(bestMove);
                        setBestMoveArrow([[bestMove.slice(0, 2), bestMove.slice(2, 4)]]);
                    }
                    if (evaluation) setEvaluation(evaluation);
                };
            }
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    };

    const getSquareStyles = () => {
        const styles = {};
        if (fromSquare) {
            styles[fromSquare] = { backgroundColor: 'rgba(173, 216, 230, 0.8)' };
        }
        if (toSquare) {
            styles[toSquare] = { backgroundColor: 'rgba(144, 238, 144, 0.8)' };
        }
        return styles;
    };

    return (
        <div>
            <h1>Chess Game with Stockfish</h1>
            <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                boardWidth={500}
                customPieces={customPieces}
                customLightSquareStyle={lightSquareStyle}
                customDarkSquareStyle={darkSquareStyle}
                customSquareStyles={getSquareStyles()}
                customArrows={bestMoveArrow}
                customArrowColor={arrowColor}
            />
            <div>
                <h3>Best Move: {bestMove || 'Calculating...'}</h3>
                <h3>Evaluation: {evaluation || 'Evaluating...'}</h3>
            </div>
        </div>
    );
};

export default App;
