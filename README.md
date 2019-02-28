# React Big Calendar Drag and Drop Auto-Select

[**GitHub Pages**](https://tomashubelbauer.github.io/rbc-dnd-auto-select)

This is a stream-of-consciousness sandbox repository where I explore whether the
React Big Calendar component utilizing the drag and drop addon can be made to
auto select the event before it is being dragged or resized so that the amount
of clicks needed goes from two (select, drag / resize) to one (immediate action).

If you aren't here for the journey and only care about the solution, go to the end.

This work relates to work on my other sandbox repository, [rbc-rbc-resizable-event-wrapper](https://github.com/TomasHubelbauer/rbc-resizable-event-wrapper).
In that repository I have found that when using the drag and drop addon, it is
best to use the `event` component instead of the `eventWrapper` component as an
activation zone for specifically Ant `Popover`, but more generally any content
which needs to stay on the are of the event.

This is because when using just the `eventWrapper` component, the event wrapper
stays around the even. When using it in conjunction with the drag and drop addon,
it instead stacks on top of the day column and has a zero height.

Let's prove that.

```powershell
npx create-react-app . --typescript
npm install react-big-calendar moment --save
npm install @types/react-big-calendar --save-dev
```

Follow the [setup instructions](http://intljusticemission.github.io/react-big-calendar/examples/index.html)
to get a basic calendar going and set it to week view.

Next up hook up the `components` property and set up a component for the
`eventWrapper` field. You can just wrap the `props.children` in a `div`
and see that since the `rbc-event` div - what we're wrapping - is absolutely
positioned in CSS, it will jump out of this wrapper `div` and it will
stack on top of the day column having zero height.

```tsx
class EventWrapperComponent extends React.Component<EventWrapperProps, never> {
  public render() {
    return (
      <div data-info="This container does not wrap the event but instead stacks at the top of the day column container">
        {this.props.children}
      </div>
    );
  }
}
```

This cannot be fixed by making the wrapper `div` relative. That would
squash the `rbc-event` container. Unless we could also get the `rbc-event`
container's dynamic `style.top` property value to mirror in the event
wrapper (we can't), the event wrapper won't help us.

Next up we could try using the `event` component, but that one will only
fill up the area not occupied by the time range line or the drag and drop
addon resizing handles. Our goal is to auto-select as event before the
user starts dragging or resizing so we absolutely cannot miss a mouse
event over the drag and drop addon resizing handles.

```tsx
class EventComponent extends React.Component<EventWrapperProps, never> {
  public render() {
    return (
      <div data-info="This container doesn't fill the whole area of the event, importantly the time range line and the resize handles" style={{ height: '100%' }}>
        {this.props.children}
      </div>
    );
  }
}
```

What could work is to use an event wrapper after all but instead of
actually wrapping the children, clone the sole top-level subtree root
child and add the event handlers on it.

It would look like this:

```tsx
function BoundEventWrapperComponent(app: App) {
  return class EventWrapperComponent extends React.Component<EventWrapperProps, never> {
    public render() {
      return React.cloneElement(React.Children.only(this.props.children) as ReactElement, { onMouseOver: this.onEventDivMouseOver });
    }
  
    private readonly onEventDivMouseOver: React.MouseEventHandler<HTMLDivElement> = event => {
      console.log(this.props);
    };
  };
}
```

However putting this together turns out we can access the `style` of the event!
It's right there in the `props`. :-) So we can set the same style to the event
wrapper and just put a mouse handler on it. We can introduce this immediate div
without any issues. Do notice however that in the style object pass in, the values
are in percents but are bare numbers so they get interpreted as pixels. This
needs to be fixed otherwise the style would be off.

```tsx
function BoundEventWrapperComponent(app: App) {
  return class EventWrapperComponent extends React.Component<EventWrapperProps, never> {
    public render() {
      // The left, top, width & height values are in percentages but come as bare numbers so we need to help that
      const style = {
        left: this.props.style!.left + '%',
        top: this.props.style!.top + '%',
        width: this.props.style!.width + '%',
        height: this.props.style!.height + '%',
        position: 'absolute' as 'absolute',
      };

      return (
        <div onMouseOver={this.onEventWrapperDivMouseOver} style={style}>
          {this.props.children}
        </div>
      );
    }
  
    private readonly onEventWrapperDivMouseOver: React.MouseEventHandler<HTMLDivElement> = _event => {
      app.setState({ selected: this.props.event });
    };
  };
}
```

By positioning the wrapper, the event needs to be reset to be placed at 0,0 and
fill the absolute wrapper container area.

```tsx
<style>{`.rbc-event { left: initial !important; top: initial !important; width: 100% !important; height: 100% !important; }`}</style>
```

But now we finally have a container to hook mouse events handlers up to.
We propagate the event from the wrapped to the state of the application so that
it finds its way back to the calendar's `selected` prop and now hovering over a
set of events in the calendar makes it so that they become selected as soon as
they get hovered-over.

The next step is to see if this still works with the DnD addon implemented.
To implement it, follow the DnD addon starter here:

https://github.com/arecvlohe/rbc-with-dnd-starter/blob/master/src/App.js

Now when using the drag or resize features, during the action, the event fill up
the entire day column, so I guess the `React.cloneElement` approach is better.
Let's try that.

```tsx
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
```

Welp, turns out the selection state of the event doesn't affect the DnD behavior at all,
events need to be clicked once before being actioned no matter what. I requested this changes:

https://github.com/intljusticemission/react-big-calendar/issues/1227

The above I have since found does not reproduce on the demo site of the calendar
and even in the RBC source code when checked out locally, installed and ran using
`npm run examples`. However the demo code is exactly the same as what I have in this
repo.

I figured maybe there are fixes in trunk which have not made it to NPM yet so I
tried to link to the local instance of the RBC source code, which I attempted by
changing its build script to use `set` for environment variables and then running
`npm run build`. Afterwards, I pointed into the local RBC source directory by running
`npm install ../react-big-calendar` however this didn't work because it was looking
for some files which existed in `lib` in `dist` and I don't know why.
