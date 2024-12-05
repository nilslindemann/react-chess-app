import React, { useState, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

const App = () => {
    const [game, setGame] = useState(new Chess());
    const [stockfish, setStockfish] = useState(null);
    const [currentLines, setCurrentLines] = useState([]);
    const [previousLines, setPreviousLines] = useState([]);
    const [bestEvaluation, setBestEvaluation] = useState(null);
    const [lastMove, setLastMove] = useState(null);
    const [moveCategory, setMoveCategory] = useState('');

    useEffect(() => {
        const stockfishInstance = new Worker(`${process.env.PUBLIC_URL}/js/stockfish-16.1-lite-single.js`);
        setStockfish(stockfishInstance);
        return () => {
            stockfishInstance.terminate();
        };
    }, []);

    const getEvaluation = (fen) => {
        if (!stockfish) return;
        return new Promise((resolve) => {
            const lines = [];
            stockfish.postMessage('setoption name MultiPV value 3');
            stockfish.postMessage(`position fen ${fen}`);
            stockfish.postMessage('go depth 12');
            const isBlackTurn = fen.split(' ')[1] === 'b';

            stockfish.onmessage = (event) => {
                const message = event.data;
                if (message.startsWith('info depth 12')) {
                    const match = message.match(/score cp (-?\d+).* pv (.+)/);
                    if (match) {
                        let evalScore = parseInt(match[1], 10) / 100;
                        const moves = match[2].split(' ');
                        if (isBlackTurn) {
                            evalScore = -evalScore;
                        }
                        lines.push({ eval: evalScore, moves });
                        if (lines.length === 3) {
                            stockfish.postMessage('stop');
                            lines.sort((a, b) => (isBlackTurn ? a.eval - b.eval : b.eval - a.eval));
                            setPreviousLines(currentLines);
                            setCurrentLines(lines);
                            setBestEvaluation(lines[0].eval);
                            resolve(lines);
                        }
                    }
                }
            };
        });
    };

    const getMoveCategory = useCallback(() => {
        const previousTopLine = previousLines[0];
        const previousSecondLine = previousLines[1];
        const previousThirdLine = previousLines[2];
        if (!bestEvaluation || !lastMove || !previousTopLine) {
            setMoveCategory('');
            return;
        }
        const previousTopMove = previousTopLine?.moves[0];
        const previousSecondMove = previousSecondLine?.moves[0];
        const previousThirdMove = previousThirdLine?.moves[0];
        if (lastMove === previousTopMove) {
            setMoveCategory('Top');
        } else if (lastMove === previousSecondMove || lastMove === previousThirdMove) {
            setMoveCategory('Good Move');
        } else {
            const evaluationDifference = Math.abs(bestEvaluation - previousTopLine.eval);
            if (evaluationDifference <= 1) {
                setMoveCategory('Ok');
            } else if (evaluationDifference <= 2) {
                setMoveCategory('Inaccuracy');
            } else if (evaluationDifference >= 3) {
                setMoveCategory('Blunder');
            }
        }
    }, [bestEvaluation, lastMove, previousLines]);

    useEffect(() => {
        if (previousLines.length > 0 && bestEvaluation !== null && lastMove) {
            getMoveCategory();
        }
    }, [previousLines, bestEvaluation, lastMove, getMoveCategory]);

    const onDrop = async (sourceSquare, targetSquare) => {
        const gameCopy = new Chess(game.fen());
        try {
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q',
            });
            if (move === null) return false;
            setGame(gameCopy);
            setLastMove(`${sourceSquare}${targetSquare}`);
            await getEvaluation(gameCopy.fen());
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    };

    return (
        <div>
            <h1>Game Review with Stockfish</h1>
            <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                boardWidth={500}
            />
            <div>
                <h2>Top 3 Lines at Depth 12</h2>
                <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                    {currentLines.map((line, index) => (
                        <li key={index} style={{ marginBottom: '10px' }}>
                            <strong>Line {index + 1}:</strong> {line.eval} <br />
                            <strong>Moves:</strong> {line.moves.join(' ')}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h3>Move Category: {moveCategory}</h3>
            </div>
        </div>
    );
};

export default App;
