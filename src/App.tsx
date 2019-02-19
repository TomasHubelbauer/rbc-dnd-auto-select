import React, { ReactElement, ReactChild } from 'react';
import BigCalendar, { stringOrDate, EventWrapperProps } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
const withDragAndDrop = require('react-big-calendar/lib/addons/dragAndDrop');
// TODO: Type this I guess but for this demo I won't bother, it's BigCalendar with onEventDrop and onEventResize extra props
const DragAndDropCalendar = withDragAndDrop(BigCalendar);

type AppProps = {};

type AppState = {
  events: any[];
  selected: any;
};

export default class App extends React.Component<AppProps, AppState> {
  public readonly state: AppState = {
    events: [],
    selected: undefined,
  };

  private readonly localizer = BigCalendar.momentLocalizer(moment);

  private readonly components = {
    eventWrapper: BoundEventWrapperComponent(this),
  };

  public render() {
    return (
      <div className="App">
        <style>{`.rbc-addons-dnd-resize-ns-icon { zoom: 5 !important; }`}</style>
        <DragAndDropCalendar
          localizer={this.localizer}
          components={this.components}
          events={this.state.events}
          defaultView="week"
          selectable
          onSelectSlot={this.onCalendarSelectSlot}
          selected={this.state.selected}
          onEventDrop={console.log}
          onEventResize={console.log}
          resizable
        />
      </div>
    );
  }

  private readonly onCalendarSelectSlot = (slotInfo: { start: stringOrDate, end: stringOrDate }) => {
    this.setState(state => ({ events: [...state.events, { start: slotInfo.start, end: slotInfo.end }] }))
  };
}

function BoundEventWrapperComponent(app: App) {
  return class EventWrapperComponent extends React.Component<EventWrapperProps, never> {
    public render() {
      const stockEventWrapper = React.Children.only(this.props.children) as React.ReactElement;
      const oldEventDiv = React.Children.only(stockEventWrapper.props.children) as React.ReactElement;
      const newEventDiv = React.cloneElement(oldEventDiv, { onMouseOver: this.onEventDivMouseOver });
      return React.cloneElement(stockEventWrapper, { children: newEventDiv });
    }
  
    private readonly onEventDivMouseOver: React.MouseEventHandler<HTMLDivElement> = _event => {
      app.setState({ selected: this.props.event });
    };
  };
}
