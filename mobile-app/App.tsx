import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { GameScreen } from './src/ui/screens/GameScreen';

const App: React.FC = () => {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f4c3a' }}>
        <GameScreen />
      </SafeAreaView>
    </>
  );
};

export default App;
