(function() {
    /**
     * ChessTime - UI交互逻辑
     * 处理界面渲染和用户交互
     */

    const { PieceType, Color, Board, Move, GameHistory, PieceSymbols } = window.ChessTime;

    class GameUI {
        constructor(game) {
            this.game = game;
            this.selectedSquare = null;
            this.validMoves = [];
            this.lastMove = null;
            this.initElements();
            this.initEventListeners();
        }

        initElements() {
            this.screens = {
                mainMenu: document.getElementById('main-menu'),
                difficultyMenu: document.getElementById('difficulty-menu'),
                creditsScreen: document.getElementById('credits-screen'),
                loadScreen: document.getElementById('load-screen'),
                gameScreen: document.getElementById('game-screen')
            };

            this.buttons = {
                startGame: document.getElementById('start-game'),
                loadGame: document.getElementById('load-game'),
                difficultyBtn: document.getElementById('difficulty-btn'),
                credits: document.getElementById('credits'),
                backFromDifficulty: document.getElementById('back-from-difficulty'),
                backFromCredits: document.getElementById('back-from-credits'),
                backFromLoad: document.getElementById('back-from-load'),
                playerReverse: document.getElementById('player-reverse'),
                playerSave: document.getElementById('player-save'),
                playerLoad: document.getElementById('player-load'),
                restartGame: document.getElementById('restart-game'),
                backToMenu: document.getElementById('back-to-menu'),
                closeSaveModal: document.getElementById('close-save-modal'),
                closeLoadModal: document.getElementById('close-load-modal')
            };

            this.difficultyButtons = document.querySelectorAll('.difficulty-btn');
            this.chessBoard = document.getElementById('chess-board');
            
            this.statusLights = {
                playerCheckmate: document.getElementById('player-checkmate'),
                playerStalemate: document.getElementById('player-stalemate'),
                opponentCheckmate: document.getElementById('opponent-checkmate'),
                opponentStalemate: document.getElementById('opponent-stalemate')
            };

            this.capturedPieces = {
                player: document.getElementById('player-captured'),
                opponent: document.getElementById('opponent-captured')
            };

            this.modals = {
                gameOver: document.getElementById('game-over-modal'),
                saveSuccess: document.getElementById('save-success-modal'),
                loadGame: document.getElementById('load-game-modal')
            };

            this.saveList = document.getElementById('save-list');
            this.modalSaveList = document.getElementById('modal-save-list');
            this.gameResult = document.getElementById('game-result');
            this.gameResultMessage = document.getElementById('game-result-message');
        }

        initEventListeners() {
            this.buttons.startGame.addEventListener('click', () => this.game.startGame());
            this.buttons.loadGame.addEventListener('click', () => this.showLoadScreen());
            this.buttons.difficultyBtn.addEventListener('click', () => this.showScreen('difficultyMenu'));
            this.buttons.credits.addEventListener('click', () => this.showScreen('creditsScreen'));
            
            this.buttons.backFromDifficulty.addEventListener('click', () => this.showScreen('mainMenu'));
            this.buttons.backFromCredits.addEventListener('click', () => this.showScreen('mainMenu'));
            this.buttons.backFromLoad.addEventListener('click', () => this.showScreen('mainMenu'));

            this.difficultyButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const difficulty = btn.dataset.difficulty;
                    this.game.setDifficulty(difficulty);
                    this.updateDifficultySelection(difficulty);
                });
            });

            this.buttons.playerReverse.addEventListener('click', () => this.game.undoMove());
            this.buttons.playerSave.addEventListener('click', () => this.game.saveGame());
            this.buttons.playerLoad.addEventListener('click', () => this.showLoadModal());

            this.buttons.restartGame.addEventListener('click', () => {
                this.hideModal('gameOver');
                this.game.startGame();
            });

            this.buttons.backToMenu.addEventListener('click', () => {
                this.hideModal('gameOver');
                this.showScreen('mainMenu');
            });

            this.buttons.closeSaveModal.addEventListener('click', () => this.hideModal('saveSuccess'));
            this.buttons.closeLoadModal.addEventListener('click', () => this.hideModal('loadGame'));
        }

        showScreen(screenName) {
            Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
            this.screens[screenName].classList.add('active');
        }

        updateDifficultySelection(selectedDifficulty) {
            this.difficultyButtons.forEach(btn => {
                btn.classList.remove('selected');
                if (btn.dataset.difficulty === selectedDifficulty) {
                    btn.classList.add('selected');
                }
            });
        }

        renderBoard() {
            this.chessBoard.innerHTML = '';
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const square = document.createElement('div');
                    square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                    square.dataset.row = row;
                    square.dataset.col = col;
                    
                    const piece = this.game.board.getPiece(row, col);
                    if (piece) {
                        const pieceElement = document.createElement('span');
                        pieceElement.className = `piece ${piece.color}`;
                        pieceElement.textContent = piece.getSymbol();
                        square.appendChild(pieceElement);
                    }

                    if (this.selectedSquare && 
                        this.selectedSquare.row === row && 
                        this.selectedSquare.col === col) {
                        square.classList.add('selected');
                    }

                    const isValidMove = this.validMoves.some(m => 
                        m.toRow === row && m.toCol === col
                    );
                    if (isValidMove) {
                        const targetPiece = this.game.board.getPiece(row, col);
                        square.classList.add(targetPiece ? 'valid-capture' : 'valid-move');
                    }

                    if (this.lastMove) {
                        if (this.lastMove.fromRow === row && this.lastMove.fromCol === col) {
                            square.classList.add('last-move-from');
                        }
                        if (this.lastMove.toRow === row && this.lastMove.toCol === col) {
                            square.classList.add('last-move-to');
                        }
                    }

                    square.addEventListener('click', () => this.handleSquareClick(row, col));
                    
                    this.chessBoard.appendChild(square);
                }
            }
        }

        handleSquareClick(row, col) {
            if (this.game.gameOver || this.game.currentTurn !== Color.WHITE) {
                return;
            }

            const piece = this.game.board.getPiece(row, col);

            if (this.selectedSquare) {
                const selectedPiece = this.game.board.getPiece(this.selectedSquare.row, this.selectedSquare.col);
                
                if (piece && piece.color === selectedPiece.color) {
                    this.selectedSquare = { row, col };
                    this.validMoves = this.game.board.getLegalMoves(row, col);
                    this.renderBoard();
                    return;
                }

                const move = this.validMoves.find(m => 
                    m.toRow === row && m.toCol === col
                );

                if (move) {
                    this.game.makeMove(move);
                    this.selectedSquare = null;
                    this.validMoves = [];
                    this.lastMove = move;
                    this.renderBoard();
                    return;
                }

                this.selectedSquare = null;
                this.validMoves = [];
                this.renderBoard();
                return;
            }

            if (piece && piece.color === Color.WHITE) {
                this.selectedSquare = { row, col };
                this.validMoves = this.game.board.getLegalMoves(row, col);
                this.renderBoard();
            }
        }

        updateStatusLights() {
            const playerCheck = this.game.board.isInCheck(Color.WHITE);
            const opponentCheck = this.game.board.isInCheck(Color.BLACK);
            
            const playerCheckmate = this.game.board.isCheckmate(Color.WHITE);
            const opponentCheckmate = this.game.board.isCheckmate(Color.BLACK);
            
            const playerStalemate = this.game.board.isStalemate(Color.WHITE);
            const opponentStalemate = this.game.board.isStalemate(Color.BLACK);

            if (playerCheckmate) {
                this.statusLights.playerCheckmate.classList.add('active');
            } else {
                this.statusLights.playerCheckmate.classList.remove('active');
            }

            if (opponentCheckmate) {
                this.statusLights.opponentCheckmate.classList.add('active');
            } else {
                this.statusLights.opponentCheckmate.classList.remove('active');
            }

            if (playerStalemate) {
                this.statusLights.playerStalemate.classList.add('active');
            } else {
                this.statusLights.playerStalemate.classList.remove('active');
            }

            if (opponentStalemate) {
                this.statusLights.opponentStalemate.classList.add('active');
            } else {
                this.statusLights.opponentStalemate.classList.remove('active');
            }
        }

        updateCapturedPieces() {
            this.capturedPieces.player.innerHTML = '';
            this.capturedPieces.opponent.innerHTML = '';

            this.game.capturedPieces.player.forEach(piece => {
                const pieceElement = document.createElement('span');
                pieceElement.className = 'captured-piece';
                pieceElement.textContent = PieceSymbols[piece.color][piece.type];
                this.capturedPieces.player.appendChild(pieceElement);
            });

            this.game.capturedPieces.opponent.forEach(piece => {
                const pieceElement = document.createElement('span');
                pieceElement.className = 'captured-piece';
                pieceElement.textContent = PieceSymbols[piece.color][piece.type];
                this.capturedPieces.opponent.appendChild(pieceElement);
            });
        }

        showGameOver(winner) {
            if (winner === Color.WHITE) {
                this.gameResult.textContent = '玩家获胜！';
                this.gameResultMessage.textContent = '恭喜你战胜了AI对手！';
            } else if (winner === Color.BLACK) {
                this.gameResult.textContent = 'AI获胜！';
                this.gameResultMessage.textContent = '再接再厉，下次一定能赢！';
            } else {
                this.gameResult.textContent = '平局！';
                this.gameResultMessage.textContent = '这是一场精彩的对局！';
            }
            this.showModal('gameOver');
        }

        showSaveSuccess() {
            this.showModal('saveSuccess');
        }

        showLoadScreen() {
            this.updateSaveList(this.saveList);
            this.showScreen('loadScreen');
        }

        showLoadModal() {
            this.updateSaveList(this.modalSaveList, true);
            this.showModal('loadGame');
        }

        updateSaveList(container, isModal = false) {
            container.innerHTML = '';
            const saves = this.game.getSaveFiles();

            if (saves.length === 0) {
                const noSaves = document.createElement('p');
                noSaves.className = 'no-saves';
                noSaves.textContent = '暂无存档';
                container.appendChild(noSaves);
                return;
            }

            saves.forEach(save => {
                const saveItem = document.createElement('div');
                saveItem.className = 'save-item';
                
                const saveName = document.createElement('div');
                saveName.className = 'save-name';
                saveName.textContent = save.name;
                
                const saveDate = document.createElement('div');
                saveDate.className = 'save-date';
                saveDate.textContent = new Date(save.date).toLocaleString('zh-CN');

                saveItem.appendChild(saveName);
                saveItem.appendChild(saveDate);

                saveItem.addEventListener('click', () => {
                    this.game.loadGame(save.name);
                    if (isModal) {
                        this.hideModal('loadGame');
                    } else {
                        this.showScreen('gameScreen');
                    }
                });

                container.appendChild(saveItem);
            });
        }

        showModal(modalName) {
            this.modals[modalName].classList.remove('hidden');
        }

        hideModal(modalName) {
            this.modals[modalName].classList.add('hidden');
        }

        resetGameUI() {
            this.selectedSquare = null;
            this.validMoves = [];
            this.lastMove = null;
            this.updateStatusLights();
            this.updateCapturedPieces();
            this.renderBoard();
        }
    }

    window.GameUI = GameUI;
})();
