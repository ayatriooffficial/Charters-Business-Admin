import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import CountUp from 'react-countup';

const LEVEL_COLORS = {
  Beginner: 'var(--red)',
  Growing: 'var(--orange)',
  Strong: 'var(--navy)',
  Expert: 'var(--green)'
};

export default function ScoreRing({ score = 0, level = 'Beginner', size = 180, animate = true }) {
  const color = LEVEL_COLORS[level] || 'var(--accent)';

  return (
    <div style={{
      width: size,
      height: size,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <CircularProgressbar
        value={score}
        strokeWidth={8}
        styles={buildStyles({
          strokeLinecap: 'round',
          trailColor: '#efe8de',
          pathColor: color,
          pathTransitionDuration: 1.2
        })}
      />

      {/* Centre text */}
      <div style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: size * 0.22,
          fontWeight: 800,
          color,
          lineHeight: 1
        }}>
          {animate
            ? <CountUp end={score} duration={1.5} />
            : score
          }
        </span>
        <span style={{
          fontSize: size * 0.075,
          color: 'var(--text-muted)',
          marginTop: 2
        }}>
          / 100
        </span>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: size * 0.08,
          fontWeight: 600,
          color,
          marginTop: 4,
          letterSpacing: '0.04em'
        }}>
          {level}
        </span>
      </div>
    </div>
  );
}

