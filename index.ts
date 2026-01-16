
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTask } from './widget-task';

registerWidgetTaskHandler(widgetTask);

// Must appear last
import 'expo-router/entry';
