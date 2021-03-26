import React, { Component } from "react";
import classnames from "classnames";
import axios from "axios";

import Loading from "./Loading.jsx";
import Panel from "./Panel.jsx";
import {
  getTotalInterviews,
  getLeastPopularTimeSlot,
  getMostPopularDay,
  getInterviewsPerDay
 } from "helpers/selectors";
 import { setInterview } from "helpers/reducers";

const data = [
  {
    id: 1,
    label: "Total Interviews",
    // use helper functions to determine values
    getValue: getTotalInterviews
  },
  {
    id: 2,
    label: "Least Popular Time Slot",
    getValue: getLeastPopularTimeSlot
  },
  {
    id: 3,
    label: "Most Popular Day",
    getValue: getMostPopularDay
  },
  {
    id: 4,
    label: "Interviews Per Day",
    getValue: getInterviewsPerDay
  }
];

class Dashboard extends Component {

  state = {
    loading: true,
    focused: null,
    days: [],
    appointments: {},
    interviewers: {}
  };

  componentDidMount() {
    // grab data from server via axios requests
    Promise.all([
      axios.get("/api/days"),
      axios.get("/api/appointments"),
      axios.get("/api/interviewers"),
    ]).then(([days, appointments, interviewers]) => {
      this.setState({
        loading: false,
        days: days.data,
        appointments: appointments.data,
        interviewers: interviewers.data
      })
    })

    // websocket connection updated component data in real time
    this.socket = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL);

    // listen for messages on connection 
    // use message to update state when appts canceled or booked
    this.socket.onmessage = event => {
      const data = JSON.parse(event.data);

      if (typeof data === "object" && data.type === "SET_INTERVIEW") {
        this.setState(previousState =>
          setInterview(previousState, data.id, data.interview)
        );
      }
    }

    // once we have data we can merge it to existing state object
    const focused = JSON.parse(localStorage.getItem("focused"));

    if (focused) {
      this.setState({ focused });
    }
  }

  
  componentDidUpdate(previousProps, previousState) {
    if (previousState.focused !== this.state.focused) {
      localStorage.setItem("focused", JSON.stringify(this.state.focused));
    }
  }

  componentWillUnmount() {
    this.socket.close();
  }
  // toggle state from 4 panel to focused view
  selectPanel(id) {
    this.setState(previousState => ({
      focused: previousState.focused !== null? null : id
    }));
  }

  render() {
    const dashboardClasses = classnames("dashboard", {
      "dashboard--focused": this.state.focused
    });

    if (this.state.loading) {
      return <Loading />;
    }

    const panels = data
    .filter(
      panel => this.state.focused === null || this.state.focused === panel.id
      )
    .map(panel => (
      < Panel
        key={panel.id}
        label={panel.label}
        value={panel.getValue(this.state)}
        onSelect={event => this.selectPanel(panel.id)}
      />
    ));

    return (
      <main className={dashboardClasses}>{panels}</main>
    );
  }
}

export default Dashboard;
