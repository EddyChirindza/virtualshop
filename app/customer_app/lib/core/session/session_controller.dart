import 'package:flutter_riverpod/flutter_riverpod.dart';

class SessionState {
  const SessionState({this.userId, this.generation = 0, this.isGuest = false});

  final int? userId;
  final int generation;
  final bool isGuest;

  bool get isActive => userId != null;
  bool get canBrowse => isGuest || isActive;

  bool isCurrent(int generation) => this.generation == generation;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SessionState &&
          other.userId == userId &&
          other.generation == generation &&
          other.isGuest == isGuest;

  @override
  int get hashCode => Object.hash(userId, generation, isGuest);
}

class SessionController extends Notifier<SessionState> {
  @override
  SessionState build() => const SessionState();

  void beginSession(int userId) {
    state = SessionState(userId: userId, generation: state.generation + 1);
  }

  void enterGuestMode() {
    if (state.isActive) return;
    if (state.isGuest) return;
    state = SessionState(isGuest: true, generation: state.generation + 1);
  }

  void exitGuestMode() {
    if (!state.isGuest) return;
    state = SessionState(generation: state.generation + 1);
  }

  void endSession({int? expectedGeneration}) {
    if (expectedGeneration != null && state.generation != expectedGeneration) {
      return;
    }
    if (!state.isActive) return;
    state = SessionState(generation: state.generation + 1);
  }

  bool isCurrent(int generation) => state.generation == generation;
}

final sessionControllerProvider =
    NotifierProvider<SessionController, SessionState>(SessionController.new);

extension SessionRefExtensions on Ref {
  SessionState get sessionState => read(sessionControllerProvider);

  bool isSessionCurrent(int generation) =>
      read(sessionControllerProvider).isCurrent(generation);
}
