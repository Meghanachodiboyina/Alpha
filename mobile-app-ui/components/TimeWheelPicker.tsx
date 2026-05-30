import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

const ITEM_HEIGHT = 44; // Fixed height for each item

interface TimeWheelPickerProps {
  value: string; // "HH:mm" in 24h format internally
  onChange: (time: string) => void;
}

export default function TimeWheelPicker({ value, onChange }: TimeWheelPickerProps) {
  const { theme } = useTheme();

  // Parse internal 24h format into 12h pieces
  const [h24, m] = value ? value.split(':').map(Number) : [9, 0];
  const initialAmPm = h24 >= 12 ? 'PM' : 'AM';
  const initialHour = h24 % 12 || 12;
  const initialMinute = m;

  const [selectedHour, setSelectedHour] = useState(initialHour);
  const [selectedMinute, setSelectedMinute] = useState(initialMinute);
  const [selectedAmPm, setSelectedAmPm] = useState(initialAmPm);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const ampms = ['AM', 'PM'];

  // Update parent when parts change
  useEffect(() => {
    let h24Out = selectedHour;
    if (selectedAmPm === 'PM' && h24Out < 12) h24Out += 12;
    if (selectedAmPm === 'AM' && h24Out === 12) h24Out = 0;

    const hStr = String(h24Out).padStart(2, '0');
    const mStr = String(selectedMinute).padStart(2, '0');
    onChange(`${hStr}:${mStr}`);
  }, [selectedHour, selectedMinute, selectedAmPm]);

  const renderList = (data: any[], selected: any, setSelected: any, width: number, format = (v: any) => v) => {
    const listRef = useRef<ScrollView>(null);
    const initialIndex = data.indexOf(selected);

    useEffect(() => {
      if (initialIndex > 0 && listRef.current) {
        setTimeout(() => {
          listRef.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
        }, 100);
      }
    }, [initialIndex]);

    return (
      <View style={{ height: ITEM_HEIGHT * 5, width, overflow: 'hidden' }}>
        <ScrollView
          ref={listRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
            if (data[index] !== undefined) {
              setSelected(data[index]);
            }
          }}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        >
          {data.map((item) => (
            <View key={item} style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 22, 
                fontWeight: selected === item ? '700' : '500',
                color: selected === item ? theme.text : theme.text3
              }}>
                {format(item)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: ITEM_HEIGHT * 5, backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden' }}>
      {/* Selection Highlight */}
      <View style={{ position: 'absolute', top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT, width: '100%', backgroundColor: theme.border, opacity: 0.4, borderRadius: 8 }} pointerEvents="none" />
      
      {renderList(hours, selectedHour, setSelectedHour, 50)}
      <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, paddingHorizontal: 2, paddingBottom: 4 }}>:</Text>
      {renderList(minutes, selectedMinute, setSelectedMinute, 50, (v) => String(v).padStart(2, '0'))}
      <View style={{ width: 10 }} />
      {renderList(ampms, selectedAmPm, setSelectedAmPm, 60)}
    </View>
  );
}
