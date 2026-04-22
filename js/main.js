(function() {
    /**
     * ChessTime - 主程序入口
     * 整合所有模块，管理游戏状态
     */

    const { PieceType, Color, Board, Move, GameHistory, Piece } = window.ChessTime;
    const ChessAI = window.ChessAI;
    const GameUI = window.GameUI;

    class ChessTimeGame {
        constructor() {
            this.board = new Board();
            this.ai = new ChessAI('medium');
            this.history = new GameHistory();
            this.currentTurn = Color.WHITE;
            this.gameOver = false;
            this.capturedPieces = {
                player: [],
                opponent: []
            };
            this.ui = new GameUI(this);
            this.ui.updateDifficultySelection('medium');
            this.init();
        }

        init() {
            console.log('ChessTime - 穿越时间的象棋');
            console.log('赛博朋克风格国际象棋游戏');
        }

        setDifficulty(difficulty) {
            this.ai.setDifficulty(difficulty);
            console.log(`难度已设置为: ${this.ai.getDifficultyName()}`);
        }

        startGame() {
            this.board = new Board();
            this.history = new GameHistory();
            this.currentTurn = Color.WHITE;
            this.gameOver = false;
            this.capturedPieces = {
                player: [],
                opponent: []
            };
            this.ui.showScreen('gameScreen');
            this.ui.resetGameUI();
            console.log('游戏开始！玩家执白先行。');
        }

        makeMove(move) {
            if (this.gameOver) return false;

            if (move.capturedPiece) {
                if (this.currentTurn === Color.WHITE) {
                    this.capturedPieces.player.push(move.capturedPiece);
                } else {
                    this.capturedPieces.opponent.push(move.capturedPiece);
                }
            }

            this.history.addMove(move, this.board);
            this.board.makeMove(move);

            this.ui.updateCapturedPieces();
            this.checkGameState();

            if (!this.gameOver) {
                this.switchTurn();
                
                if (this.currentTurn === Color.BLACK) {
                    setTimeout(() => this.makeAIMove(), 500);
                }
            }

            return true;
        }

        makeAIMove() {
            if (this.gameOver || this.currentTurn !== Color.BLACK) return;

            const aiMove = this.ai.selectBestMove(this.board, Color.BLACK);
            
            if (aiMove) {
                this.ui.lastMove = aiMove;
                this.makeMove(aiMove);
                this.ui.renderBoard();
            }
        }

        switchTurn() {
            this.currentTurn = this.currentTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
        }

        checkGameState() {
            this.ui.updateStatusLights();

            if (this.board.isGameOver()) {
                this.gameOver = true;
                const winner = this.board.getWinner();
                
                if (winner) {
                    console.log(`游戏结束！${winner === Color.WHITE ? '玩家' : 'AI'}获胜！`);
                } else {
                    console.log('游戏结束！平局！');
                }
                
                this.ui.showGameOver(winner);
            }
        }

        undoMove() {
            if (this.history.size() === 0) {
                console.log('没有可悔棋的步骤');
                return false;
            }

            if (this.currentTurn === Color.BLACK) {
                console.log('AI回合不能悔棋');
                return false;
            }

            let undoCount = 1;
            if (this.history.size() >= 2) {
                undoCount = 2;
            }

            for (let i = 0; i < undoCount; i++) {
                const undoResult = this.history.undo();
                if (undoResult) {
                    if (undoResult.move.capturedPiece) {
                        if (i === 0) {
                            this.capturedPieces.player.pop();
                        } else {
                            this.capturedPieces.opponent.pop();
                        }
                    }
                }
            }

            const lastState = this.history.boardStates[this.history.boardStates.length - 1];
            if (lastState) {
                this.board = lastState.clone();
            } else {
                this.board = new Board();
            }

            this.currentTurn = Color.WHITE;
            this.gameOver = false;

            if (this.history.size() > 0) {
                const moves = this.history.moves;
                this.ui.lastMove = moves[moves.length - 1];
            } else {
                this.ui.lastMove = null;
            }

            this.ui.updateCapturedPieces();
            this.ui.updateStatusLights();
            this.ui.selectedSquare = null;
            this.ui.validMoves = [];
            this.ui.renderBoard();

            console.log('悔棋成功');
            return true;
        }

        saveGame() {
            const saveData = {
                version: '1.0.0',
                date: new Date().toISOString(),
                difficulty: this.ai.difficulty,
                currentTurn: this.currentTurn,
                gameOver: this.gameOver,
                capturedPieces: {
                    player: this.capturedPieces.player.map(p => ({ type: p.type, color: p.color })),
                    opponent: this.capturedPieces.opponent.map(p => ({ type: p.type, color: p.color }))
                },
                boardState: this.serializeBoard(),
                historyMoves: this.history.moves.map(m => ({
                    fromRow: m.fromRow,
                    fromCol: m.fromCol,
                    toRow: m.toRow,
                    toCol: m.toCol,
                    isCastling: m.isCastling,
                    isEnPassant: m.isEnPassant
                }))
            };

            const jsonString = JSON.stringify(saveData, null, 2);
            
            const saveName = `save_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            
            this.downloadSave(saveName, jsonString);
            
            this.ui.showSaveSuccess();
            console.log(`游戏已保存为: ${saveName}`);
        }

        downloadSave(filename, content) {
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        getSaveFiles() {
            return [
                {
                    name: '示例存档',
                    date: new Date().toISOString()
                }
            ];
        }

        loadGame(saveName) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const saveData = JSON.parse(event.target.result);
                            this.restoreGame(saveData);
                            console.log(`存档已加载: ${file.name}`);
                        } catch (error) {
                            console.error('加载存档失败:', error);
                            alert('存档文件格式错误');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            
            input.click();
        }

        restoreGame(saveData) {
            try {
                this.ai.setDifficulty(saveData.difficulty || 'medium');
                this.currentTurn = saveData.currentTurn || Color.WHITE;
                this.gameOver = saveData.gameOver || false;

                this.capturedPieces = {
                    player: saveData.capturedPieces?.player?.map(p => new Piece(p.type, p.color)) || [],
                    opponent: saveData.capturedPieces?.opponent?.map(p => new Piece(p.type, p.color)) || []
                };

                this.board = this.deserializeBoard(saveData.boardState);

                this.history = new GameHistory();
                if (saveData.historyMoves) {
                    for (const moveData of saveData.historyMoves) {
                        const piece = this.board.getPiece(moveData.fromRow, moveData.fromCol);
                        if (piece) {
                            const move = new Move(
                                moveData.fromRow,
                                moveData.fromCol,
                                moveData.toRow,
                                moveData.toCol,
                                piece,
                                null,
                                moveData.isCastling,
                                moveData.isEnPassant
                            );
                            this.history.moves.push(move);
                            this.history.boardStates.push(this.board.clone());
                        }
                    }
                }

                this.ui.showScreen('gameScreen');
                this.ui.resetGameUI();
                
                if (this.history.moves.length > 0) {
                    this.ui.lastMove = this.history.moves[this.history.moves.length - 1];
                    this.ui.renderBoard();
                }

                if (this.currentTurn === Color.BLACK && !this.gameOver) {
                    setTimeout(() => this.makeAIMove(), 500);
                }

            } catch (error) {
                console.error('恢复游戏失败:', error);
            }
        }

        serializeBoard() {
            const grid = [];
            for (let row = 0; row < 8; row++) {
                const rowData = [];
                for (let col = 0; col < 8; col++) {
                    const piece = this.board.getPiece(row, col);
                    if (piece) {
                        rowData.push({
                            type: piece.type,
                            color: piece.color,
                            hasMoved: piece.hasMoved
                        });
                    } else {
                        rowData.push(null);
                    }
                }
                grid.push(rowData);
            }

            return {
                grid,
                enPassantTarget: this.board.enPassantTarget,
                castlingRights: this.board.castlingRights,
                halfMoveClock: this.board.halfMoveClock,
                fullMoveNumber: this.board.fullMoveNumber
            };
        }

        deserializeBoard(boardState) {
            const board = new Board();
            board.grid = board.createEmptyBoard();

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const pieceData = boardState.grid[row][col];
                    if (pieceData) {
                        const piece = new Piece(pieceData.type, pieceData.color);
                        piece.hasMoved = pieceData.hasMoved;
                        board.setPiece(row, col, piece);
                    }
                }
            }

            board.enPassantTarget = boardState.enPassantTarget;
            board.castlingRights = boardState.castlingRights;
            board.halfMoveClock = boardState.halfMoveClock;
            board.fullMoveNumber = boardState.fullMoveNumber;

            return board;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.chessGame = new ChessTimeGame();
    });
})();
